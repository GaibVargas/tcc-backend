import { Paginated, PaginationQuery } from '../../common/pagination'
import HttpRequestError from '../../utils/error'
import userModel from '../user/model'
import { MinUser } from '../user/type'
import quizModel from './model'
import { CreateQuizPayload, Quiz, QuizResume, UpdateQuizPayload } from './type'

export async function createQuiz(user: MinUser, quiz: CreateQuizPayload): Promise<Quiz> {
  const new_quiz = await quizModel.createQuiz(user, quiz)
  if (!new_quiz)
    throw new HttpRequestError({
      status_code: 400,
      message: 'Error creating quiz.'
    })
  return new_quiz
}

export async function getQuiz(public_id: string): Promise<Quiz> {
  const quiz = await quizModel.findQuizByPublicId(public_id)
  if (!quiz)
    throw new HttpRequestError({
      status_code: 400,
      message: 'Quiz not found.'
    })
  return quiz
}

export async function updateQuiz(public_id: string, quiz: UpdateQuizPayload): Promise<Quiz> {
  const new_quiz = await quizModel.findQuizByPublicIdAndUpdate(public_id, quiz)
  if (!new_quiz)
    throw new HttpRequestError({
      status_code: 400,
      message: 'Quiz not found.'
    })
  return new_quiz
}

export async function userIsAuthorOfQuizOrThrow(user_public_id: string, quiz_public_id: string): Promise<void> {
  const author_public_id = await quizModel.getQuizAuthorPublicId(quiz_public_id)
  if (author_public_id !== user_public_id) {
    throw new HttpRequestError({
      status_code: 401,
      message: 'Unauthorized'
    })
  }
}

export async function deleteQuiz(public_id: string): Promise<void> {
  await quizModel.deleteQuizByPublicId(public_id)
}

export async function getQuizzesByAuthor(user_public_id: string, query: PaginationQuery): Promise<Paginated<QuizResume[]>> {
  const user_id = await userModel.getUserIdByPublicId(user_public_id)
  return await quizModel.findQuizResumesByAuthorId(user_id, query)
}

export async function getQuizIdByPublicId(public_id: string): Promise<number> {
  return await quizModel.getQuizIdByPublicId(public_id)
}

const quizServices = {
  createQuiz,
  getQuiz,
  updateQuiz,
  userIsAuthorOfQuizOrThrow,
  deleteQuiz,
  getQuizzesByAuthor,
  getQuizIdByPublicId,
}

export default quizServices
