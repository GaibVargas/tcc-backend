import { Server, Socket } from 'socket.io'
import { MinUser } from '../entities/user/type'
import {
  InstructorSessionState,
  ParticipantSessionState,
  SessionIdentification,
  SessionParticipants,
  SessionParticipantsQuestionAnswered,
} from '../entities/session/type'

export interface ClientToServerEvents {
  'instructor:connect': (payload: SessionIdentification) => Promise<void>
  'instructor:disconnect': (payload: SessionIdentification) => Promise<void>
  'participant:connect': (payload: SessionIdentification) => Promise<void>
  'participant:disconnect': (payload: SessionIdentification) => Promise<void>
}

export interface ServerToClientEvents {
  'game:instructor:participant-join': (
    payload: SessionParticipants,
  ) => Promise<void>
  'game:instructor:participant-leave': (
    payload: SessionParticipants,
  ) => Promise<void>
  'game:instructor:update-state': (
    payload: InstructorSessionState,
  ) => Promise<void>
  'game:instructor:question-answer': (
    payload: SessionParticipantsQuestionAnswered,
  ) => Promise<void>
  'game:participant:update-state': (
    payload: ParticipantSessionState,
  ) => Promise<void>
  'game:end': (payload: SessionIdentification) => Promise<void>
}

export interface SocketData {
  user: MinUser
}

export interface EventsMap {
  [event: string]: (...args: unknown[]) => void;
}

export type CustomServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  EventsMap,
  SocketData
>
export type CustomSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  EventsMap,
  SocketData
>
