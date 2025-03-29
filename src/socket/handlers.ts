import { CustomServer, CustomSocket } from './types'
import { delay } from '../utils/time'
import { SessionsManager } from '../entities/session/sessions-manager'
import { SessionIdentification } from '../entities/session/type'

const sessions_manager = SessionsManager.getInstance()
export async function instructorJoin(
  io: CustomServer,
  socket: CustomSocket,
  payload: SessionIdentification,
): Promise<void> {
  await delay(1)
  sessions_manager.instructorEnterSession(payload.code, socket)
  console.log(socket.data.user.public_id, '[i] enter in', payload.code)
}

export async function instructorLeave(
  io: CustomServer,
  socket: CustomSocket,
  payload: SessionIdentification,
): Promise<void> {
  await delay(1)
  sessions_manager.instructorLeaveSession(payload.code)
  console.log(socket.data.user.public_id, '[i] leave in', payload.code)
}

export async function participantJoin(
  io: CustomServer,
  socket: CustomSocket,
  payload: SessionIdentification,
): Promise<void> {
  await sessions_manager.participantEnterSession(payload.code, socket.data.user, socket)
  console.log(socket.data.user.public_id, '[p] enter in', payload.code)
}

export async function participantLeave(
  io: CustomServer,
  socket: CustomSocket,
  payload: SessionIdentification,
): Promise<void> {
  await delay(1)
  sessions_manager.participantLeaveSession(payload.code, socket.data.user)
  console.log(socket.data.user.public_id, '[p] leave in', payload.code)
}
