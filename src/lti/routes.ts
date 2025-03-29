import { FastifyInstance } from 'fastify'
import { MoodleLTIServices } from './moodle/services'
import LTIControllers from './controllers'

const moodleLTIServices = new MoodleLTIServices()
const ltiControllers = new LTIControllers(moodleLTIServices)

export default function ltiRoutes(
  fastify: FastifyInstance,
  _options: unknown,
): void {
  fastify.post('/login', ltiControllers.startLauch.bind(ltiControllers))
  fastify.post('/redirect', ltiControllers.login.bind(ltiControllers))
  fastify.get('/jwks', ltiControllers.getJWKS.bind(ltiControllers))
}
