import { CustomServer, CustomSocket } from './types.js'
import * as handler from './handlers.js'

export function registerSocketHandlers(io: CustomServer, socket: CustomSocket): void {
  socket.on('instructor:connect', payload => handler.instructorJoin(io, socket, payload))
  socket.on('participant:connect', payload => handler.participantJoin(io, socket, payload))
}

