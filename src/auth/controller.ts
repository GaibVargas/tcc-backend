import { FastifyReply, FastifyRequest } from 'fastify'
import authService from './services'
import { LoggedUserTokens } from '../entities/user/services'

export async function refreshToken(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<LoggedUserTokens> {
  const refresh_token = req.headers['www-authenticate']
  if (!refresh_token) {
    return reply
      .status(400)
      .send({ message: 'Authorization token is required' })
  }
  return await authService.refreshAccessToken(refresh_token)
}

const authController = {
  refreshToken,
}

export default authController
