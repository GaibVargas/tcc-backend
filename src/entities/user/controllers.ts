import { FastifyReply, FastifyRequest } from 'fastify'
import userServices, { LoggedUserTokens } from './services.js'
import { MinUser } from './type.js'
import { userVerify } from '../../auth/services.js'

interface AuthQueryParams {
  auth_token: string
}

export async function loginUser(
  req: FastifyRequest<{ Querystring: AuthQueryParams }>,
  _reply: FastifyReply,
): Promise<LoggedUserTokens> {
  return await userServices.loginUser(req.query.auth_token)
}

type GetUserResponse = MinUser & {
  context: { course: string; activity: string }
}
export async function getUser(
  req: FastifyRequest,
  _req: FastifyReply,
): Promise<GetUserResponse> {
  userVerify(req.user)
  const lms = await userServices.getUserLMSDataById(req.user.id)
  return {
    ...req.user,
    context: {
      course: lms.lms_context_course,
      activity: lms.lms_context_activity,
    },
  }
}

const userControllers = {
  loginUser,
  getUser,
}

export default userControllers
