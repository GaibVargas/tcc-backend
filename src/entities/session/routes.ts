import { FastifyInstance } from 'fastify'
import { authenticationPlugin, isInstructorPlugin } from '../../auth/plugin'
import sessionControllers from './controllers'

export default function sessionRoutes(
  fastify: FastifyInstance,
  _options: unknown,
): void {
  fastify.register(authenticationPlugin)
  fastify.get('/sync/:code', sessionControllers.getSessionState)
  fastify.post('/answer/:code', sessionControllers.answerSessionQuestion)
  fastify.post('/join/:code', sessionControllers.participantJoinSession)
  fastify.post('/leave/:code', sessionControllers.participantLeaveSession)

  fastify.register(instructorSessionRoutes)
}

function instructorSessionRoutes(fastify: FastifyInstance, _options: unknown): void {
  fastify.register(isInstructorPlugin)
  fastify.get('/ongoing', sessionControllers.ongoingSessionsByAuthor)
  fastify.get('/finished', sessionControllers.finishedSessionsByAuthor)
  fastify.post('/', sessionControllers.createSession)
  fastify.post('/start/:code', sessionControllers.startSession)
  fastify.post('/next-step/:code', sessionControllers.sessionNextStep)
  fastify.post('/early-end/:code', sessionControllers.sessionEarlyEnd)
  fastify.post('/send-grades/:code', sessionControllers.sessionSendGrades)
  fastify.get('/report/view/:public_id', sessionControllers.sessionReportView)
}
