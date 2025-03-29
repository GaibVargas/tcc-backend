import { FastifyReply, FastifyRequest } from 'fastify'
import quizServices from './services'
import { create_quiz_schema, Quiz, QuizResume, update_quiz_schema } from './type'
import { userVerify } from '../../auth/services'
import { Paginated, pagination_query_schema, PaginationQuery } from '../../common/pagination'
import { PublicIdParams } from '../../common/query'

export async function createQuiz(
  req: FastifyRequest,
  _reply: FastifyReply,
): Promise<Quiz> {
  userVerify(req.user)
  return await quizServices.createQuiz(
    req.user,
    create_quiz_schema.parse(req.body),
  )
}

export async function getQuiz(
  req: FastifyRequest<{ Params: PublicIdParams }>,
  _reply: FastifyReply,
): Promise<Quiz> {
  return await quizServices.getQuiz(req.params.public_id)
}

export async function updateQuiz(
  req: FastifyRequest<{ Params: PublicIdParams }>,
  _reply: FastifyReply,
): Promise<Quiz> {
  userVerify(req.user)
  await quizServices.userIsAuthorOfQuizOrThrow(req.user.public_id, req.params.public_id)
  return await quizServices.updateQuiz(req.params.public_id, update_quiz_schema.parse(req.body))
}

export async function deleteQuiz(
  req: FastifyRequest<{ Params: PublicIdParams }>,
  _reply: FastifyReply,
): Promise<void> {
  userVerify(req.user)
  await quizServices.userIsAuthorOfQuizOrThrow(req.user.public_id, req.params.public_id)
  await quizServices.deleteQuiz(req.params.public_id)
}

export async function getQuizzesByAuthor(
  req: FastifyRequest<{ Querystring: PaginationQuery }>,
  _reply: FastifyReply,
): Promise<Paginated<QuizResume[]>> {
  userVerify(req.user)
  return await quizServices.getQuizzesByAuthor(req.user.public_id, pagination_query_schema.parse(req.query))
}

const quizController = {
  createQuiz,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizzesByAuthor,
}

export default quizController
