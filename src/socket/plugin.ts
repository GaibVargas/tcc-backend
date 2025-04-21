import { FastifyPluginCallback } from 'fastify'
import { Server } from 'socket.io'
import { config } from '../config/env.js'
import { ClientToServerEvents, EventsMap, ServerToClientEvents, SocketData } from './types.js'
import { verifyToken } from '../auth/token.js'
import { minUserSchema } from '../entities/user/type.js'
import { registerSocketHandlers } from './event-listeners.js'

const socketIOPlugin: FastifyPluginCallback = (fastify, _options, done) => {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    EventsMap,
    SocketData
  >(fastify.server, {
    cors: {
      origin: config.host.FRONTEND_URL,
    },
  })

  io.use((socket, next) => {
    const access_token = socket.handshake.auth.access_token as
      | string
      | null
      | undefined

    if (!access_token) {
      return next(new Error('Authorization token is required'))
    }

    const token = verifyToken(access_token, config.auth.ACCESS_TOKEN_SECRET)
    if (!token.valid) {
      return next(new Error(token.error))
    }

    socket.data.user = minUserSchema.parse(token.decoded)
    next()
  })

  io.on('connection', (socket) => {
    registerSocketHandlers(io, socket)
    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })

  fastify.decorate('io', io)

  done()
}

export default socketIOPlugin
