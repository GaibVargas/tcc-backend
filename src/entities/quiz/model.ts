import { z } from 'zod'
import prisma from '../../config/db'
import userModel from '../user/model'
import { MinUser } from '../user/type'
import {
  CreateQuizPayload,
  QuestionType,
  Quiz,
  quiz_resume_schema,
  quiz_schema,
  QuizResume,
  UpdateQuizPayload,
} from './type'
import {
  getPrismaPagination,
  Paginated,
  PaginationQuery,
} from '../../common/pagination'

export async function createQuiz(
  user: MinUser,
  quiz: CreateQuizPayload,
): Promise<Quiz | null> {
  const author_id = await userModel.getUserIdByPublicId(user.public_id)
  const quiz_db = await prisma.quiz.create({
    data: {
      title: quiz.title,
      author: { connect: { id: author_id } },
      questions: {
        create: quiz.questions.map((question) => ({
          type: question.type,
          description: question.description,
          time_limit: question.time_limit ?? null,
          correct_text_answer: question.correct_text_answer,
          options: {
            create: question.options.map((option) => ({
              description: option.description,
              is_correct_answer: option.is_correct_answer,
            })),
          },
        })),
      },
    },
    include: {
      questions: {
        include: { options: true },
      },
    },
  })
  const parsed_quiz = quiz_schema.safeParse(quiz_db)
  if (parsed_quiz.error) return null
  return parsed_quiz.data
}

export async function findQuizByPublicId(
  public_id: string,
): Promise<Quiz | null> {
  const quiz_db = await prisma.quiz.findUnique({
    where: { public_id, is_deleted: false },
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
    },
  })
  const parsed_quiz = quiz_schema.safeParse(quiz_db)
  if (parsed_quiz.error) return null
  return parsed_quiz.data
}

export async function findQuizByPublicIdAndUpdate(
  public_id: string,
  quiz: UpdateQuizPayload,
): Promise<Quiz | null> {
  const previous_quiz = await findQuizByPublicId(public_id)
  if (!previous_quiz) return null
  await prisma.$transaction(async (tx) => {
    // Update Quiz
    if (previous_quiz.title !== quiz.title) {
      await tx.quiz.update({
        where: { public_id },
        data: { title: quiz.title },
      })
    }

    // Handle existing questions updates
    for (const prev_question of previous_quiz.questions) {
      const cur_question = quiz.questions.find(
        (q) => q.public_id === prev_question.public_id,
      )
      // Flag deleted question
      if (!cur_question) {
        await tx.question.update({
          where: { public_id: prev_question.public_id },
          data: { is_deleted: true },
        })
        continue
      }
      // Update question
      if (
        cur_question.correct_text_answer !==
          prev_question.correct_text_answer ||
        cur_question.description !== prev_question.description ||
        cur_question.time_limit !== prev_question.time_limit ||
        cur_question.type !== prev_question.type
      ) {
        await tx.question.update({
          where: { public_id: prev_question.public_id },
          data: {
            correct_text_answer: cur_question.correct_text_answer,
            description: cur_question.description,
            time_limit: cur_question.time_limit ?? null,
            type: cur_question.type,
          },
        })
      }

      //Handle options
      for (const prev_question_option of prev_question.options) {
        const cur_question_option = cur_question.options.find(
          (o) => o.public_id === prev_question_option.public_id,
        )
        // Flag deleted option
        if (!cur_question_option) {
          await tx.questionOption.update({
            where: { public_id: prev_question_option.public_id },
            data: { is_deleted: true },
          })
          continue
        }
        // Update option
        if (
          cur_question_option.description !==
            prev_question_option.description ||
          cur_question_option.is_correct_answer !==
            prev_question_option.is_correct_answer
        ) {
          await tx.questionOption.update({
            where: { public_id: prev_question_option.public_id },
            data: {
              description: cur_question_option.description,
              is_correct_answer: cur_question_option.is_correct_answer,
            },
          })
        }
      }

      // Create new options
      const prev_options_public_id = prev_question.options.map(
        (o) => o.public_id,
      )
      const new_options = cur_question.options.filter(
        (o) => !prev_options_public_id.includes(o.public_id ?? ''),
      )
      if (!new_options.length) continue
      const question_id = await tx.question.findUniqueOrThrow({
        where: { public_id: cur_question.public_id },
        select: { id: true },
      })
      for (const new_option of new_options) {
        await tx.questionOption.create({
          data: {
            question_id: question_id.id,
            description: new_option.description,
            is_correct_answer: new_option.is_correct_answer,
          },
        })
      }
    }

    // Create new questions
    const prev_questions_public_id = previous_quiz.questions.map(
      (q) => q.public_id,
    )
    const new_questions = quiz.questions.filter(
      (q) => !prev_questions_public_id.includes(q.public_id ?? ''),
    )
    if (!new_questions.length) return
    const quiz_id = await tx.quiz.findUniqueOrThrow({
      where: { public_id },
      select: { id: true },
    })
    for (const new_question of new_questions) {
      await tx.question.create({
        data: {
          quiz_id: quiz_id.id,
          type: new_question.type,
          description: new_question.description,
          time_limit: new_question.time_limit ?? null,
          correct_text_answer: new_question.correct_text_answer,
          options: {
            create: new_question.options.map((option) => ({
              description: option.description,
              is_correct_answer: option.is_correct_answer,
            })),
          },
        },
      })
    }
  })
  const current_quiz = await findQuizByPublicId(public_id)
  return current_quiz
}

export async function getQuizAuthorPublicId(
  public_id: string,
): Promise<string | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { public_id },
    include: {
      author: true,
    },
  })
  if (!quiz?.author) return null
  return quiz.author.public_id
}

export async function deleteQuizByPublicId(public_id: string): Promise<void> {
  await prisma.quiz.update({
    where: { public_id },
    data: { is_deleted: true },
  })
}

function canOpenSessionForQuiz(quiz: Quiz): boolean {
  if (!quiz.title.length) return false
  for (const question of quiz.questions) {
    if (!question.description.length) return false
    if (
      question.type === QuestionType.TEXT &&
      !question.correct_text_answer.length
    )
      return false
    if (
      (question.type === QuestionType.MULTI_CHOICE ||
        question.type === QuestionType.TRUE_OR_FALSE) &&
      !question.options.length
    )
      return false

    const is_there_correct_answer = question.options.some(
      (o) => o.is_correct_answer,
    )
    const are_all_options_with_description = question.options.every(
      (o) => o.description.length,
    )
    if (
      (question.type === QuestionType.MULTI_CHOICE ||
        question.type === QuestionType.TRUE_OR_FALSE) &&
      (!is_there_correct_answer || !are_all_options_with_description)
    )
      return false
  }
  return true
}

function getQuizResume(quiz: Quiz): QuizResume {
  return {
    public_id: quiz.public_id,
    title: quiz.title,
    n_questions: quiz.questions.length,
    can_open_session: canOpenSessionForQuiz(quiz),
  }
}

export async function findQuizResumesByAuthorId(
  author_id: number,
  query: PaginationQuery,
): Promise<Paginated<QuizResume[]>> {
  const [quizzes, count] = await prisma.$transaction([
    prisma.quiz.findMany({
      where: { author_id, is_deleted: false },
      orderBy: { updatedAt: 'desc' },
      ...getPrismaPagination(query),
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
      },
    }),
    prisma.quiz.count({
      where: { author_id, is_deleted: false },
    }),
  ])
  const formatted_quizzes = z
    .array(quiz_schema)
    .parse(quizzes)
    .map((q) => getQuizResume(q))
  return {
    items: z.array(quiz_resume_schema).parse(formatted_quizzes),
    count,
  }
}

export async function getQuizIdByPublicId(public_id: string): Promise<number> {
  const quiz = await prisma.quiz.findUniqueOrThrow({
    where: { public_id },
    select: { id: true },
  })
  return quiz.id
}

const quizModel = {
  createQuiz,
  findQuizByPublicId,
  findQuizByPublicIdAndUpdate,
  getQuizAuthorPublicId,
  deleteQuizByPublicId,
  findQuizResumesByAuthorId,
  getQuizIdByPublicId,
}

export default quizModel
