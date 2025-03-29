import { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify'
import { verifyToken } from './token'
import { config } from '../config/env'
import { minUserSchema, UserRoles } from '../entities/user/type'
import fastifyPlugin from 'fastify-plugin'

function authenticationMiddleware(req: FastifyRequest, reply: FastifyReply, done: () => void): void {
  if (req.routeOptions.config.skipAuth) {
    return done()
  }

  const access_token = req.headers.authorization
  if (!access_token) {
    reply
      .status(400)
      .send({ message: 'Authorization token is required' })
    return done()
  }
  const token = verifyToken(access_token, config.auth.ACCESS_TOKEN_SECRET)
  if (!token.valid) {
    reply.status(401).send({ message: token.error })
    return done()
  }
  req.user = minUserSchema.parse(token.decoded)
  return done()
}

const authenticationPluginCb: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('onRequest', authenticationMiddleware)
  done()
}
export const authenticationPlugin = fastifyPlugin(authenticationPluginCb, { name: 'authenticationPlugin' })

function isInstructorMiddleware(req: FastifyRequest, reply: FastifyReply, done: () => void): void {
  if (req.routeOptions.config.skipAuth || req.routeOptions.config.skipRole) {
    return done()
  }
  if (!req.user) {
    reply
      .status(401)
      .send({ message: 'Unauthorized' })
    return done()
  }

  if (req.user.role !== UserRoles.INSTRUCTOR) {
    reply
      .status(401)
      .send({ message: 'Unauthorized' })
    return done()
  }
  return done()
}

const isInstructorPluginCb: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('onRequest', isInstructorMiddleware)
  done()
}
export const isInstructorPlugin = fastifyPlugin(isInstructorPluginCb, { name: 'isInstructorPlugin' }) 
