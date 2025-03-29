import {
  InstructorSessionState,
  ParticipantSessionState,
  PlayerGradeAndScoreItem,
  RankingType,
  RecoveredSessionAnswer,
  SessionStatus,
} from './type'
import { generateRandomString } from '../../utils/string'
import { Quiz } from '../quiz/type'
import { MinUser } from '../user/type'
import { QuizManager } from '../quiz/quiz-manager'
import { CustomSocket } from '../../socket/types'
import { Ranking } from './ranking'
import sessionModel, {
  SessionQuestionAnswerData,
  SessionUpdateData,
} from './model'
import userServices from '../user/services'

type Participant = {
  user: MinUser
  player_id: number
}

export class Session {
  private db_id: number
  private code: string
  private participants: Map<string, Participant>
  private status: SessionStatus
  private quiz_manager: QuizManager
  private ranking: Ranking
  private question_timeout_id: NodeJS.Timeout | null

  private sockets: {
    instructor: CustomSocket | null
    participants: Map<string, CustomSocket>
  }

  constructor(
    private instructor: MinUser,
    quiz: Quiz,
  ) {
    this.code = generateRandomString(6)
    this.instructor = instructor
    this.participants = new Map()
    this.status = SessionStatus.WAITING_START
    this.quiz_manager = new QuizManager(quiz)
    this.ranking = new Ranking()
    this.sockets = { instructor: null, participants: new Map() }
    this.db_id = 0
    this.question_timeout_id = null
  }

  static async createSession(
    instructor: MinUser,
    quiz: Quiz,
    quiz_id: number,
  ): Promise<Session> {
    const session = new Session(instructor, quiz)
    const current_question_public_id =
      session.quiz_manager.getCurrentQuestion().public_id
    const id = await sessionModel.createSession(
      session.getCode(),
      SessionStatus.WAITING_START,
      quiz_id,
      current_question_public_id,
    )
    session.setDbId(id)
    return session
  }

  static async recoverOngoingSessions(): Promise<Session[]> {
    const sessions = await sessionModel.getOngoingSessions()
    const recovered_sessions = []
    for (const session of sessions) {
      const s = new Session(session.instructor, session.quiz)
      const players = session.players.map((p) => ({
        player_id: p.id,
        user: p.user,
      }))
      s.recoverAdditionalData(session.code, session.status, session.id, players)
      s.recoverQuizState(session.current_question_public_id, session.answers)
      recovered_sessions.push(s)
    }
    return recovered_sessions
  }

  recoverAdditionalData(
    code: string,
    status: SessionStatus,
    db_id: number,
    participants: Participant[],
  ): void {
    this.code = code
    this.status = status
    this.db_id = db_id
    for (const participant of participants) {
      this.participants.set(participant.user.public_id, participant)
    }
  }

  recoverQuizState(
    current_question_public_id: string,
    answers: RecoveredSessionAnswer[],
  ): void {
    const n_participants = this.getParticipantsId().length
    let question_index = 0
    let question = this.quiz_manager.getCurrentQuestion()
    while (true) {
      const question_answers = answers.filter(
        (a) => a.question.public_id === question.public_id,
      )
      for (const question_answer of question_answers) {
        const result = this.quiz_manager.answerQuestion(
          question_answer.player.user.public_id,
          question_answer.question.public_id,
          question_answer.value,
          n_participants,
          true,
        )
        if (!result) continue
        this.ranking.updateScore({
          id: question_answer.player.user.public_id,
          score:
            result.feedback.points +
            result.feedback.streak_bonus +
            result.feedback.velocity_bonus,
        })
      }
      if (question.public_id === current_question_public_id) break
      question = this.quiz_manager.getNextQuestion()
      question_index++
    }

    if (this.status !== SessionStatus.SHOWING_QUESTION || !question.time_limit)
      return
    if (question_index === 0) {
      this.status = SessionStatus.WAITING_START
      return
    }
    // Se a sessão é recuperada no meio de uma questão com limitação de tempo, volta um passo
    this.status = SessionStatus.FEEDBACK_SESSION
    this.quiz_manager.goToPreviousQuestion()
  }

  getCode(): string {
    return this.code
  }

  setCode(code: string): void {
    this.code = code
  }

  setDbId(id: number): void {
    this.db_id = id
  }

  isValidInstructor(public_id: string): boolean {
    return this.instructor.public_id === public_id
  }

  isValidParticipant(public_id: string): boolean {
    return this.participants.has(public_id)
  }

  async start(): Promise<void> {
    await this.saveSessionUpdate({ status: SessionStatus.SHOWING_QUESTION })
    this.status = SessionStatus.SHOWING_QUESTION
    this.startCurrentQuestion()
    this.sendStateUpdates()
  }

  private startCurrentQuestion(): void {
    const question = this.quiz_manager.startCurrentQuestion()
    if (!question.time_limit) return
    this.question_timeout_id = setTimeout(
      () => {
        this.nextStep.bind(this)()
          .then()
          .catch((e) => console.error('Error on ending question automatically', e))
      },
      question.time_limit * 1000 + 500, // Espera meio segundo a mais
    )
  }

  async nextStep(): Promise<boolean> {
    if (this.question_timeout_id) {
      clearTimeout(this.question_timeout_id)
      this.question_timeout_id = null
    }
    let finished_session = false
    switch (this.status) {
      case SessionStatus.WAITING_START:
        await this.saveSessionUpdate({ status: SessionStatus.SHOWING_QUESTION })
        this.status = SessionStatus.SHOWING_QUESTION
        this.startCurrentQuestion()
        break
      case SessionStatus.SHOWING_QUESTION:
        await this.saveQuestionAnswers(
          this.quiz_manager.getCurrentQuestion().public_id,
        )
        await this.saveSessionUpdate({
          status: SessionStatus.FEEDBACK_QUESTION,
        })
        this.status = SessionStatus.FEEDBACK_QUESTION
        break
      case SessionStatus.FEEDBACK_QUESTION:
        await this.saveSessionUpdate({ status: SessionStatus.FEEDBACK_SESSION })
        this.status = SessionStatus.FEEDBACK_SESSION
        break
      case SessionStatus.FEEDBACK_SESSION:
        const question = this.quiz_manager.getCurrentQuestion()
        const next_question = this.quiz_manager.getNextQuestion()
        if (question.public_id === next_question.public_id) {
          await this.saveSessionUpdate({ status: SessionStatus.ENDING })
          this.status = SessionStatus.ENDING
        } else {
          await this.saveSessionUpdate({
            status: SessionStatus.SHOWING_QUESTION,
            current_question_public_id: next_question.public_id,
          })
          this.status = SessionStatus.SHOWING_QUESTION
          this.startCurrentQuestion()
        }
        break
      case SessionStatus.ENDING:
        await this.endSession()
        finished_session = true
        break
      default:
        break
    }
    this.sendStateUpdates()
    return finished_session
  }

  async endSession(): Promise<void> {
    await this.saveSessionUpdate({ status: SessionStatus.FINISHED })
    await this.saveUsersGradeAndScore()
    this.sockets.instructor?.emit('game:end', { code: this.code })
    for (const socket of this.sockets.participants.values()) {
      socket.emit('game:end', { code: this.code })
    }
    this.status = SessionStatus.FINISHED
  }

  private async saveSessionUpdate(data: SessionUpdateData): Promise<void> {
    await sessionModel.updateSessionById(this.db_id, data)
  }

  private async saveQuestionAnswers(question_public_id: string): Promise<void> {
    const answers = this.quiz_manager.getQuestionAnswers(question_public_id)
    if (!answers.length) return
    const formatted_answers: SessionQuestionAnswerData[] = []
    for (const answer of answers) {
      // Respostas que foram recuperadas após uma interrupção devem ser ignoradas
      if (answer.recovered) continue

      const player_id = this.participants.get(answer.user_public_id)?.player_id
      const question_id =
        this.quiz_manager.getQuestionIdByPublicId(question_public_id)
      if (!player_id || !question_id) continue
      formatted_answers.push({
        value: answer.given_answer,
        session_id: this.db_id,
        question_id,
        player_id,
      })
    }
    await sessionModel.saveSessionQuestionAnswersById(formatted_answers)
  }

  private async saveUsersGradeAndScore(): Promise<void> {
    const grades = this.quiz_manager.getUsersGrade()
    const score = this.ranking.getRanking()
    const users_grade_score = new Map<number, PlayerGradeAndScoreItem>()
    for (const user_grade of grades) {
      const player_id = this.participants.get(
        user_grade.user_public_id,
      )?.player_id
      if (!player_id) continue
      users_grade_score.set(player_id, {
        id: player_id,
        grade: user_grade.grade,
        score: 0,
      })
    }
    for (const score_entry of score) {
      for (const user_score of score_entry.entries) {
        const player_id = this.participants.get(user_score.id)?.player_id
        if (!player_id) continue
        const user_grade_score = users_grade_score.get(player_id)
        if (!user_grade_score) {
          users_grade_score.set(player_id, {
            id: player_id,
            grade: 0,
            score: user_score.score,
          })
        } else {
          user_grade_score.score = user_score.score
        }
      }
    }
    await sessionModel.savePlayersGradeAndScore([...users_grade_score.values()])
  }

  answerQuestion(
    user_public_id: string,
    question_public_id: string,
    answer: string,
  ): void {
    if (this.status !== SessionStatus.SHOWING_QUESTION) return
    const result = this.quiz_manager.answerQuestion(
      user_public_id,
      question_public_id,
      answer,
      this.getParticipantsId().length,
    )
    if (!result) return
    this.sockets.instructor?.emit('game:instructor:question-answer', {
      code: this.code,
      question_public_id: question_public_id,
      ready_participants:
        this.quiz_manager.getParticipantsThatAnsweredQuestion(
          question_public_id,
        ),
    })
    this.ranking.updateScore({
      id: user_public_id,
      score:
        result.feedback.points +
        result.feedback.streak_bonus +
        result.feedback.velocity_bonus,
    })
  }

  private getParticipantsId(): string[] {
    return Array.from(this.participants.keys())
  }

  private getRanking(top: number | null = null): RankingType {
    const ranking = this.ranking.getRanking(top)
    return ranking.map((r) => ({
      rank: r.rank,
      players: r.entries.map((e) => ({
        name: this.participants.get(e.id)?.user?.name ?? 'Desconhecido',
        points: e.score,
      })),
    }))
  }

  getInstructorState(): InstructorSessionState {
    const base = {
      quiz: this.quiz_manager.getQuiz(),
      code: this.code,
      participants: this.getParticipantsId(),
    }

    if (this.status === SessionStatus.WAITING_START)
      return { ...base, status: SessionStatus.WAITING_START }

    const question = this.quiz_manager.getCurrentQuestion()
    if (this.status === SessionStatus.SHOWING_QUESTION) {
      return {
        ...base,
        status: SessionStatus.SHOWING_QUESTION,
        question,
        ready_participants:
          this.quiz_manager.getParticipantsThatAnsweredQuestion(
            question.public_id,
          ),
      }
    }

    if (this.status === SessionStatus.FEEDBACK_QUESTION) {
      return {
        ...base,
        status: SessionStatus.FEEDBACK_QUESTION,
        question,
        feedback: this.quiz_manager.getInstructorQuestionFeedback(
          question.public_id,
        ),
      }
    }

    if (this.status === SessionStatus.FEEDBACK_SESSION) {
      return {
        ...base,
        status: SessionStatus.FEEDBACK_SESSION,
        ranking: this.getRanking(3),
      }
    }

    return { ...base, status: this.status, ranking: this.getRanking() }
  }

  getParticipantState(user_public_id: string): ParticipantSessionState {
    const base = {
      quiz: this.quiz_manager.getQuiz(),
      code: this.code,
      participants: this.getParticipantsId(),
    }

    if (this.status === SessionStatus.WAITING_START)
      return { ...base, status: SessionStatus.WAITING_START }

    const question = this.quiz_manager.getCurrentQuestion()
    if (this.status === SessionStatus.SHOWING_QUESTION) {
      return {
        ...base,
        status: SessionStatus.SHOWING_QUESTION,
        question,
        answered: this.quiz_manager.participantHasAnsweredQuestion(
          user_public_id,
          question.public_id,
        ),
      }
    }

    if (this.status === SessionStatus.FEEDBACK_QUESTION) {
      return {
        ...base,
        status: SessionStatus.FEEDBACK_QUESTION,
        question,
        feedback: this.quiz_manager.getParticipantQuestionFeedback(
          user_public_id,
          question.public_id,
        ),
      }
    }

    if (this.status === SessionStatus.FEEDBACK_SESSION) {
      return {
        ...base,
        status: SessionStatus.FEEDBACK_SESSION,
        ranking: this.getRanking(3),
      }
    }

    return { ...base, status: this.status, ranking: this.getRanking() }
  }

  private sendStateUpdates(): void {
    this.sockets.instructor?.emit(
      'game:instructor:update-state',
      this.getInstructorState(),
    )
    for (const [
      user_public_id,
      socket,
    ] of this.sockets.participants.entries()) {
      socket.emit(
        'game:participant:update-state',
        this.getParticipantState(user_public_id),
      )
    }
  }

  connectInstructor(socket: CustomSocket): void {
    this.sockets.instructor = socket
  }

  disconnectInstructor(): void {
    this.sockets.instructor = null
  }

  connectParticipant(user_public_id: string, socket: CustomSocket): void {
    this.sockets.participants.set(user_public_id, socket)
  }

  disconnectParticipant(user_public_id: string): void {
    this.sockets.participants.delete(user_public_id)
  }

  async addParticipant(user: MinUser): Promise<void> {
    const lms_user = await userServices.getUserLMSDataById(user.id)
    const player_id = await sessionModel.upsertPlayer({
      user_id: user.id,
      session_id: this.db_id,
      ...lms_user,
    })
    this.participants.set(user.public_id, { user, player_id })
    this.sockets.instructor?.emit('game:instructor:participant-join', {
      code: this.code,
      participants: this.getParticipantsId(),
    })
  }

  removeParticipant(user: MinUser): void {
    this.participants.delete(user.public_id)
    this.sockets.instructor?.emit('game:instructor:participant-join', {
      code: this.code,
      participants: this.getParticipantsId(),
    })
  }
}
