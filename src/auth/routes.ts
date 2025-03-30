import { FastifyInstance } from 'fastify'
import authController from './controller.js'

export default function authRoutes(
  fastify: FastifyInstance,
  _options: unknown,
): void {
  fastify.get('/refresh', authController.refreshToken)
}
