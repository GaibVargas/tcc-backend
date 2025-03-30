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

export function getUser(req: FastifyRequest, _req: FastifyReply): MinUser {
  userVerify(req.user)
  return req.user
}

const userControllers = {
  loginUser,
  getUser,
}

export default userControllers
