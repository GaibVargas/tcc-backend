import { FastifyInstance } from 'fastify'
import { authenticationPlugin } from '../../auth/plugin.js'
import userControllers from './controllers.js'

export default function userRoutes(
  fastify: FastifyInstance,
  _options: unknown,
): void {
  fastify.register(authenticationPlugin)
  fastify.get('/login', { config: { skipAuth: true } }, userControllers.loginUser)
  fastify.get('/me', userControllers.getUser)
}
