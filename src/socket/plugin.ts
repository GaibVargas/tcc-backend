import { FastifyPluginCallback } from 'fastify'
import { Server } from 'socket.io'
import { config } from '../config/env'
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types'
import { verifyToken } from '../auth/token'
import { minUserSchema } from '../entities/user/type'
import { EventsMap } from 'socket.io/dist/typed-events'
import { registerSocketHandlers } from './event-listeners'

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
    console.log('Client connected')
    registerSocketHandlers(io, socket)
    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })

  fastify.decorate('io', io)

  done()
}

export default socketIOPlugin
