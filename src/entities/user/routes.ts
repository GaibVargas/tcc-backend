import { FastifyInstance } from 'fastify'
import { authenticationPlugin } from '../../auth/plugin'
import userControllers from './controllers'

export default function userRoutes(
  fastify: FastifyInstance,
  _options: unknown,
): void {
  fastify.register(authenticationPlugin)
  fastify.get('/login', { config: { skipAuth: true } }, userControllers.loginUser)
  fastify.get('/me', userControllers.getUser)
}
