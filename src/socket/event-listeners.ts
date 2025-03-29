import { CustomServer, CustomSocket } from './types'
import * as handler from './handlers'

export function registerSocketHandlers(io: CustomServer, socket: CustomSocket): void {
  socket.on('instructor:connect', payload => handler.instructorJoin(io, socket, payload))
  socket.on('participant:connect', payload => handler.participantJoin(io, socket, payload))
}

