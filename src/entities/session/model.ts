import { Session } from '@prisma/client'
import { z } from 'zod'
import prisma from '../../config/db'
import {
  PlayerGradeAndScoreItem,
  RecoveredSession,
  recoveredSessionSchema,
  SessionGradesStatus,
  SessionItem,
  session_item_schema,
  SessionStatus,
  session_report_schema,
  SessionReport,
} from './type'
import {
  Paginated,
  PaginationQuery,
  getPrismaPagination,
} from '../../common/pagination'
import { SessionPlayer, sessionPlayerSchema } from '../user/type'
import { question_type_schema, QuestionType } from '../quiz/type'

export async function createSession(
  code: string,
  status: SessionStatus,
  quiz_id: number,
  current_question_public_id: string,
): Promise<number> {
  const session = await prisma.session.create({
    data: {
      code,
      status,
      quiz_id,
      current_question_public_id,
    },
  })
  return session.id
}

export type SessionUpdateData = Partial<
  Pick<Session, 'status' | 'current_question_public_id'>
>
export async function updateSessionById(
  id: number,
  data: SessionUpdateData,
): Promise<void> {
  await prisma.session.update({
    where: { id },
    data,
  })
}

export type SessionQuestionAnswerData = {
  value: string
  player_id: number
  session_id: number
  question_id: number
}
export async function saveSessionQuestionAnswersById(
  answers: SessionQuestionAnswerData[],
): Promise<void> {
  await prisma.answer.createMany({
    data: answers,
  })
}

export type Player = {
  lms_iss: string
  lms_platform: string
  lms_user_id: string
  lms_version: string
  lms_client_id: string
  lms_outcome_source_id: string
  lms_outcome_service_url: string
  user_id: number
  session_id: number
}
export async function upsertPlayer(player: Player): Promise<number> {
  const response = await prisma.player.upsert({
    where: {
      user_id_session_id: {
        user_id: player.user_id,
        session_id: player.session_id,
      },
    },
    create: {
      ...player,
    },
    update: {
      lms_iss: player.lms_iss,
      lms_platform: player.lms_platform,
      lms_user_id: player.lms_user_id,
      lms_version: player.lms_version,
      lms_client_id: player.lms_client_id,
      lms_outcome_source_id: player.lms_outcome_source_id,
      lms_outcome_service_url: player.lms_outcome_service_url,
    },
  })
  return response.id
}

export async function getOngoingSessions(): Promise<RecoveredSession[]> {
  const sessions = await prisma.session.findMany({
    where: {
      NOT: {
        OR: [
          { status: SessionStatus.ENDING },
          { status: SessionStatus.FINISHED },
        ],
      },
    },
    include: {
      quiz: {
        include: {
          questions: {
            where: { is_deleted: false },
            orderBy: { id: 'asc' },
            include: {
              options: {
                where: { is_deleted: false },
                orderBy: { id: 'asc' },
              },
            },
          },
          author: {
            select: {
              id: true,
              public_id: true,
              name: true,
              role: true,
            },
          },
        },
      },
      players: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              public_id: true,
              name: true,
              role: true,
            },
          },
        },
      },
      answers: {
        orderBy: { id: 'asc' },
        select: {
          value: true,
          question: {
            select: {
              public_id: true,
            },
          },
          player: {
            select: {
              user: {
                select: {
                  public_id: true,
                },
              },
            },
          },
        },
      },
    },
  })
  const formatted_sessions = z
    .array(recoveredSessionSchema)
    .parse(sessions.map((s) => ({ ...s, instructor: s.quiz.author })))
  return formatted_sessions
}

export async function findOngoingSessionsByAuthorId(
  user_id: number,
): Promise<SessionItem[]> {
  const sessions = await prisma.session.findMany({
    where: {
      quiz: { author_id: user_id },
      NOT: {
        OR: [
          { status: SessionStatus.ENDING },
          { status: SessionStatus.FINISHED },
        ],
      },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      quiz: {
        select: {
          public_id: true,
          title: true,
        },
      },
      _count: {
        select: {
          players: true,
        },
      },
    },
  })
  return z.array(session_item_schema).parse(
    sessions.map((s) => ({
      ...s,
      participants: s._count.players,
    })),
  )
}

export async function findFinishedSessionsByAuthorId(
  user_id: number,
  query: PaginationQuery,
): Promise<Paginated<SessionItem[]>> {
  const [sessions, count] = await prisma.$transaction([
    prisma.session.findMany({
      where: {
        quiz: { author_id: user_id },
        OR: [
          { status: SessionStatus.ENDING },
          { status: SessionStatus.FINISHED },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      ...getPrismaPagination(query),
      include: {
        quiz: {
          select: {
            public_id: true,
            title: true,
          },
        },
        _count: {
          select: {
            players: true,
          },
        },
      },
    }),
    prisma.session.count({
      where: {
        quiz: { author_id: user_id },
        OR: [
          { status: SessionStatus.ENDING },
          { status: SessionStatus.FINISHED },
        ],
      },
    }),
  ])
  return {
    items: z.array(session_item_schema).parse(
      sessions.map((s) => ({
        ...s,
        participants: s._count.players,
      })),
    ),
    count,
  }
}

export async function savePlayersGradeAndScore(
  grades_scores: PlayerGradeAndScoreItem[],
): Promise<void> {
  const query = `
    UPDATE "Player"
    SET 
      "grade" = CASE "id"
        ${grades_scores.map(({ id, grade }) => `WHEN ${id} THEN ${grade}`).join(' ')}
      END,
      "score" = CASE "id"
        ${grades_scores.map(({ id, score }) => `WHEN ${id} THEN ${score}`).join(' ')}
      END
    WHERE "id" IN (${grades_scores.map(({ id }) => id).join(', ')});
  `
  await prisma.$executeRawUnsafe(query)
}

export async function findPlayersResultBySessionId(
  session_id: number,
): Promise<SessionPlayer[]> {
  const players = await prisma.player.findMany({
    where: { session_id },
  })
  return sessionPlayerSchema.array().parse(players)
}

export async function findSessionIdByCode(
  code: string,
): Promise<{ id: number; author_id: number } | null> {
  const session = await prisma.session.findFirst({
    where: { code },
    select: {
      id: true,
      quiz: {
        select: {
          author_id: true,
        },
      },
    },
  })
  if (!session) return null
  return {
    id: session.id,
    author_id: session.quiz.author_id,
  }
}

export async function findSessionIdByPublicId(id: string): Promise<number> {
  const session = await prisma.session.findFirstOrThrow({
    where: { public_id: id },
    select: { id: true },
  })
  return session.id
}

export async function updateSessionGradeStatusById(
  id: number,
  status: SessionGradesStatus,
): Promise<void> {
  await prisma.session.update({
    where: { id },
    data: {
      grades_status: status,
    },
  })
}

export async function findSessionReportByPubliId(id: string): Promise<SessionReport | null> {
  const session_id = await findSessionIdByPublicId(id)
  const session = await prisma.session.findFirst({
    where: { public_id: id },
    include: {
      quiz: {
        include: {
          questions: {
            include: {
              options: true,
              answers: {
                where: { session_id },
                select: {
                  value: true,
                  player: {
                    select: {
                      user: {
                        select: {
                          public_id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      },
      players: {
        select: {
          grade: true,
          score: true,
          user: {
            select: {
              public_id: true,
              name: true,
            },
          },
        },
      },
    },
  })
  if (!session) return null
  const questions = session.quiz.questions.map(question => {
    let correct_answer: string
    if (question_type_schema.parse(question.type) === QuestionType.TEXT) {
      correct_answer = question.correct_text_answer
    } else {
      correct_answer =
        question.options.find((o) => o.is_correct_answer)?.public_id ?? ''
    }
    const answers = question.answers.map(answer => {
      let given_answer: string
      if (question_type_schema.parse(question.type) === QuestionType.TEXT) {
        given_answer = answer.value
      } else {
        given_answer =
          question.options.find((o) => o.public_id === answer.value)?.description ?? ''
      }

      return {
        ...answer,
        given_answer,
        is_correct: answer.value.toLowerCase() === correct_answer.toLowerCase()
      }
    })
    const correct_answer_percentage = session.players.length > 0
      ? answers.filter(a => a.is_correct).length / session.players.length
      : 0
    return {
      ...question,
      answers,
      correct_answer_percentage,
    }
  })
  return session_report_schema.parse({
    ...session,
    quiz: {
      ...session.quiz,
      questions: questions.filter(q => !q.is_deleted || (q.is_deleted && q.answers.length > 0) ),
    }
  })
}

const sessionModel = {
  createSession,
  updateSessionById,
  saveSessionQuestionAnswersById,
  upsertPlayer,
  getOngoingSessions,
  findFinishedSessionsByAuthorId,
  findOngoingSessionsByAuthorId,
  savePlayersGradeAndScore,
  findPlayersResultBySessionId,
  findSessionIdByCode,
  updateSessionGradeStatusById,
  findSessionReportByPubliId,
}

export default sessionModel
