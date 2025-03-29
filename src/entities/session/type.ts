import { z } from 'zod'
import { Question, question_type_schema, QuestionOption, Quiz, quiz_schema } from '../quiz/type'
import { minUserSchema } from '../user/type'

export enum SessionModes {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
}

export const create_session_payload_schema = z.object({
  quiz_public_id: z.string(),
  mode: z.nativeEnum(SessionModes).nullable(),
})

export const answer_session_question_schema = z.object({
  question_public_id: z.string(),
  answer: z.string(),
})

export type SessionCreatePayload = {
  code: string
  quiz: Pick<Quiz, 'public_id' | 'title'>
}

export interface SessionIdentification {
  code: string
}

export interface SessionQuiz {
  public_id: string
  title: string
}

export interface SessionParticipants extends SessionIdentification {
  participants: string[]
}

export interface SessionParticipantsQuestionAnswered
  extends SessionIdentification {
  question_public_id: string
  ready_participants: string[]
}

export enum SessionStatus {
  WAITING_START = 'waiting-start',
  SHOWING_QUESTION = 'show-question',
  FEEDBACK_QUESTION = 'feedback-question',
  FEEDBACK_SESSION = 'feedback-session',
  ENDING = 'ending',
  FINISHED = 'finished',
}

interface SessionBaseState extends SessionIdentification, SessionParticipants {
  status: SessionStatus
  quiz: SessionQuiz
}

interface InstructorSessionWaitingState extends SessionBaseState {
  status: SessionStatus.WAITING_START
}

interface ParticipantSessionWaitingState extends SessionBaseState {
  status: SessionStatus.WAITING_START
}

type SessionQuestionOptions = Pick<QuestionOption, 'public_id' | 'description'>
export interface SessionQuestion
  extends Pick<
    Question,
    'id' | 'public_id' | 'description' | 'type' | 'time_limit'
  > {
  options: SessionQuestionOptions[]
  index: number
  total: number
  startedAt: number // Date in ms
}

interface InstructorSessionShowingQuestionState extends SessionBaseState {
  status: SessionStatus.SHOWING_QUESTION
  question: SessionQuestion
  ready_participants: string[]
}

interface ParticipantSessionShowingQuestionState
  extends Omit<InstructorSessionShowingQuestionState, 'ready_participants'> {
  answered: boolean
}

export interface InstructorSessionQuestionFeedback {
  correct_answer: string
  answers: Record<string, string[]>
}

interface InstructorSessionFeedbackQuestionState extends SessionBaseState {
  status: SessionStatus.FEEDBACK_QUESTION
  question: SessionQuestion
  feedback: InstructorSessionQuestionFeedback
}

export interface ParticipantSessionQuestionFeedback {
  given_answer: string
  correct_answer: string
  is_correct: boolean
  points: number
  velocity_bonus: number
  streak_bonus: number
}

interface ParticipantSessionFeedbackQuestionState extends SessionBaseState {
  status: SessionStatus.FEEDBACK_QUESTION
  question: SessionQuestion
  feedback: ParticipantSessionQuestionFeedback
}

interface RankingEntry {
  name: string
  points: number
}

export type RankingType = {
  rank: string
  players: RankingEntry[]
}[]

interface SessionFeedbackSessionState extends SessionBaseState {
  status:
    | SessionStatus.FEEDBACK_SESSION
    | SessionStatus.ENDING
    | SessionStatus.FINISHED
  ranking: RankingType
}

export type InstructorSessionState =
  | InstructorSessionWaitingState
  | InstructorSessionShowingQuestionState
  | InstructorSessionFeedbackQuestionState
  | SessionFeedbackSessionState

export type ParticipantSessionState =
  | ParticipantSessionWaitingState
  | ParticipantSessionShowingQuestionState
  | ParticipantSessionFeedbackQuestionState
  | SessionFeedbackSessionState

export const recoveredSessionAnswerSchema = z.object({
  value: z.string(),
  player: z.object({
    user: z.object({
      public_id: z.string(),
    }),
  }),
  question: z.object({
    public_id: z.string(),
  }),
})
export type RecoveredSessionAnswer = z.infer<
  typeof recoveredSessionAnswerSchema
>

export const recoveredSessionSchema = z.object({
  id: z.number(),
  code: z.string(),
  status: z.nativeEnum(SessionStatus),
  current_question_public_id: z.string(),
  quiz: quiz_schema,
  instructor: minUserSchema,
  players: z.array(
    z.object({
      id: z.number(),
      user: minUserSchema,
    }),
  ),
  answers: z.array(recoveredSessionAnswerSchema),
})
export type RecoveredSession = z.infer<typeof recoveredSessionSchema>

export enum SessionGradesStatus {
  NOT_SENDED = 'not-sended',
  SENDED = 'sended',
  ERROR = 'error',
}

export const session_item_schema = z.object({
  public_id: z.string(),
  code: z.string(),
  quiz: z.object({
    public_id: z.string(),
    title: z.string(),
  }),
  participants: z.number(),
  grades_status: z.nativeEnum(SessionGradesStatus),
  updatedAt: z.date(),
})
export type SessionItem = z.infer<typeof session_item_schema>

export type PlayerGradeAndScoreItem = {
  id: number
  grade: number
  score: number
}

const user_session_report_schema = minUserSchema.pick({ public_id: true, name: true })
const player_session_report_schema = z.object({
  grade: z.number(),
  score: z.number(),
  user: user_session_report_schema,
})
const question_answer_session_report_schema = z.object({
  value: z.string(),
  player: z.object({
    user: user_session_report_schema
  }),
  given_answer: z.string(),
  is_correct: z.boolean(),
})
const question_session_report_Schema = z.object({
  public_id: z.string(),
  type: question_type_schema,
  description: z.string(),
  time_limit: z.number().nullable(),
  correct_text_answer: z.string(),
  is_deleted: z.boolean(),
  answers: z.array(question_answer_session_report_schema),
  correct_answer_percentage: z.number(),
})
const quiz_session_report = z.object({
  public_id: z.string(),
  author_id: z.number(),
  title: z.string(),
  is_deleted: z.boolean(),
  questions: z.array(question_session_report_Schema),
})
export const session_report_schema = z.object({
  public_id: z.string(),
  code: z.string(),
  status: z.nativeEnum(SessionStatus),
  grades_status: z.nativeEnum(SessionGradesStatus),
  quiz: quiz_session_report,
  players: z.array(player_session_report_schema),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type SessionReport = z.infer<typeof session_report_schema>
