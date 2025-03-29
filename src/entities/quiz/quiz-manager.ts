import { GradeItem, Question, QuestionType, Quiz } from './type'
import {
  InstructorSessionQuestionFeedback,
  ParticipantSessionQuestionFeedback,
  SessionQuestion,
  SessionQuiz,
} from '../session/type'

type AnswerFeedback = {
  is_correct: boolean
  points: number
  velocity_bonus: number
  streak_bonus: number
}

export type Answer = {
  user_public_id: string
  given_answer: string
  feedback: AnswerFeedback
  recovered?: boolean
}

export class QuizManager {
  private current_question: number
  private questions_start_time: Map<string, number> // chave: public_id da questão, valor: timestamp
  private answers: Map<string, Answer[]> // chave: public_id da questão

  constructor(private quiz: Quiz) {
    this.current_question = 0
    this.answers = new Map()
    this.questions_start_time = new Map()
  }

  // Deve ser usado somente em casos de recuperação de sessão
  goToPreviousQuestion(): void {
    this.current_question = Math.max(0, this.current_question - 1)
  }

  getQuiz(): SessionQuiz {
    return {
      public_id: this.quiz.public_id,
      title: this.quiz.title,
    }
  }

  getQuestionIdByPublicId(question_public_id: string): number | undefined {
    const question = this.quiz.questions.find(
      (q) => q.public_id === question_public_id,
    )
    return question?.id
  }

  getCurrentQuestion(): SessionQuestion {
    const question = this.quiz.questions[this.current_question]
    return {
      id: question.id,
      public_id: question.public_id,
      description: question.description,
      type: question.type,
      time_limit: question.time_limit,
      index: this.current_question + 1,
      total: this.quiz.questions.length,
      options: question.options.map(({ public_id, description }) => ({
        public_id,
        description,
      })),
      startedAt: this.questions_start_time.get(question.public_id) ?? 0,
    }
  }

  startCurrentQuestion(): SessionQuestion {
    const question = this.getCurrentQuestion()
    const setup_start_time = this.questions_start_time.get(question.public_id)
    if (setup_start_time !== undefined) {
      return {
        ...question,
        startedAt: setup_start_time,
      }
    }
    const start_time = Date.now() // UTC
    this.questions_start_time.set(question.public_id, start_time)
    return {
      ...question,
      startedAt: start_time,
    }
  }

  private nextQuestion(): void {
    const next_index = this.current_question + 1
    this.current_question = Math.min(next_index, this.quiz.questions.length - 1)
  }

  getNextQuestion(): SessionQuestion {
    this.nextQuestion()
    return this.getCurrentQuestion()
  }

  answerQuestion(
    user_public_id: string,
    question_public_id: string,
    given_answer: string,
    n_participants: number,
    is_recovered = false,
  ): Answer | undefined {
    const question = this.getCurrentQuestion()
    if (question.public_id !== question_public_id) return
    const answer: Answer = {
      user_public_id,
      given_answer,
      feedback: this.getAnswerFeedback(
        user_public_id,
        question_public_id,
        given_answer,
        n_participants,
      ),
      recovered: is_recovered,
    }
    const question_answers = this.answers.get(question_public_id)
    if (!question_answers) this.answers.set(question_public_id, [answer])
    else question_answers.push(answer)
    return answer
  }

  participantHasAnsweredQuestion(
    user_public_id: string,
    question_public_id: string,
  ): boolean {
    const answers = this.answers.get(question_public_id)
    if (!answers) return false
    return answers.some((a) => a.user_public_id === user_public_id)
  }

  getParticipantsThatAnsweredQuestion(question_public_id: string): string[] {
    const answers = this.answers.get(question_public_id)
    if (!answers) return []
    return Array.from(answers.map((a) => a.user_public_id))
  }

  getParticipantQuestionFeedback(
    user_public_id: string,
    question_public_id: string,
  ): ParticipantSessionQuestionFeedback {
    const default_feedback: ParticipantSessionQuestionFeedback = {
      correct_answer: '',
      given_answer: '',
      is_correct: false,
      points: 0,
      streak_bonus: 0,
      velocity_bonus: 0,
    }
    const question = this.quiz.questions.filter(
      (q) => q.public_id === question_public_id,
    )[0]
    if (!question) return default_feedback

    default_feedback.correct_answer = this.getQuestionCorrectAnswer(question)

    const given_answers = this.answers.get(question_public_id)
    if (!given_answers) return default_feedback

    const given_answer = given_answers.filter(
      (a) => a.user_public_id === user_public_id,
    )[0]
    if (!given_answer) return default_feedback
    return {
      correct_answer: default_feedback.correct_answer,
      given_answer: given_answer.given_answer,
      ...given_answer.feedback,
    }
  }

  getInstructorQuestionFeedback(
    question_public_id: string,
  ): InstructorSessionQuestionFeedback {
    const default_feedback: InstructorSessionQuestionFeedback = {
      correct_answer: '',
      answers: {},
    }
    const question = this.quiz.questions.filter(
      (q) => q.public_id === question_public_id,
    )[0]
    if (!question) return default_feedback

    default_feedback.correct_answer = this.getQuestionCorrectAnswer(question)

    const answers = this.answers.get(question_public_id)
    if (!answers) return default_feedback

    default_feedback.answers = answers.reduce(
      (acc: Record<string, string[]>, answer) => {
        const given_answer = answer.given_answer.toLocaleLowerCase()
        if (!acc[given_answer]) acc[given_answer] = [answer.user_public_id]
        else acc[given_answer].push(answer.user_public_id)
        return acc
      },
      {},
    )

    return default_feedback
  }

  private getAnswerFeedback(
    user_public_id: string,
    question_public_id: string,
    given_answer: string,
    n_participants: number,
  ): AnswerFeedback {
    const is_correct = this.isAnswerCorrect(given_answer)
    return {
      is_correct,
      points: is_correct ? 100 : 0,
      streak_bonus: is_correct
        ? this.getStreakBonus(user_public_id, question_public_id)
        : 0,
      velocity_bonus: is_correct
        ? this.getVelocityBonus(question_public_id, n_participants)
        : 0,
    }
  }

  private isAnswerCorrect(given_answer: string): boolean {
    const question = this.quiz.questions[this.current_question]
    const correct_answer = this.getQuestionCorrectAnswer(question)
    return (
      given_answer.toLocaleLowerCase() === correct_answer.toLocaleLowerCase()
    )
  }

  private getQuestionCorrectAnswer(question: Question): string {
    if (question.type === QuestionType.TEXT) {
      return question.correct_text_answer
    }
    const option = question.options.filter((o) => o.is_correct_answer)[0]
    if (!option) return ''
    return option.public_id
  }

  private getVelocityBonus(
    question_public_id: string,
    n_participants: number,
  ): number {
    const max_participants = 20 // Somente os primeiros 20 a responder ganham bônus
    return Math.max(
      0,
      Math.min(n_participants, max_participants) -
        (this.getParticipantsThatAnsweredQuestion(question_public_id).length +
          1), // Soma um pois a respnsta do usuário atual ainda não foi considerada
    )
  }

  private getStreakBonus(
    user_public_id: string,
    question_public_id: string,
  ): number {
    const streak = this.getUserStreak(user_public_id, question_public_id)
    if (streak < 1) return 0
    if (streak < 2) return 10
    return 20
  }

  private getUserStreak(
    user_public_id: string,
    question_public_id: string,
  ): number {
    const question_index = this.quiz.questions.findIndex(
      (q) => q.public_id === question_public_id,
    )

    // Se for a primeira questão não há sequência de acertos
    if (question_index < 1) return 0

    const longest_streak = 2
    let streak = 0
    let current_question_index = question_index - 1
    while (streak < longest_streak && current_question_index >= 0) {
      const question = this.quiz.questions[current_question_index]
      const answers = this.answers.get(question.public_id)
      if (!answers || !answers.length) break
      const user_answer = answers.find(
        (a) => a.user_public_id === user_public_id,
      )
      if (!user_answer) break
      if (!user_answer.feedback.is_correct) break
      streak++
      current_question_index--
    }
    return streak
  }

  getQuestionAnswers(question_public_id: string): Answer[] {
    const answers = this.answers.get(question_public_id)
    if (!answers) return []
    return answers
  }

  getUsersGrade(): GradeItem[] {
    const user_correct_answers_count = new Map<string, number>()
    for (const question of this.quiz.questions) {
      const answers = this.answers.get(question.public_id)
      if (!answers) continue
      for (const answer of answers) {
        if (!answer.feedback.is_correct) continue
        const user_correct_answers = user_correct_answers_count.get(
          answer.user_public_id,
        )
        if (!user_correct_answers) {
          user_correct_answers_count.set(answer.user_public_id, 1)
          continue
        }
        user_correct_answers_count.set(
          answer.user_public_id,
          user_correct_answers + 1,
        )
      }
    }
    const n_questions = this.quiz.questions.length
    const response = []
    for (const [
      user_public_id,
      correct_answers,
    ] of user_correct_answers_count.entries()) {
      response.push({
        user_public_id,
        grade: n_questions > 0 ? correct_answers / n_questions : 0,
      })
    }
    return response
  }
}
