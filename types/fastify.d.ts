import { Server } from 'socket.io'
import { MinUser } from '../src/entities/user/type'

declare module 'fastify' {
  interface FastifyInstance {
    io: Server
  }

  interface FastifyRequest {
    user?: MinUser
  }

  interface FastifyContextConfig {
    skipAuth?: boolean
    skipRole?: boolean
  }
}
