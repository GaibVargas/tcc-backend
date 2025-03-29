import { Quiz } from '../quiz/type'
import { MinUser } from '../user/type'
import { Session } from './session'
import { CustomSocket } from '../../socket/types'

export class SessionsManager {
  private static instance: SessionsManager
  active_sessions: Map<string, Session>

  constructor() {
    this.active_sessions = new Map()
  }

  static getInstance(): SessionsManager {
    if (!SessionsManager.instance) {
      SessionsManager.instance = new SessionsManager()
    }
    return SessionsManager.instance
  }

  async recoverSessions(): Promise<void> {
    const sessions = await Session.recoverOngoingSessions()
    for (const session of sessions) {
      this.active_sessions.set(session.getCode(), session)
    }
  }

  async newSession(
    instructor: MinUser,
    quiz: Quiz,
    quiz_id: number,
  ): Promise<string> {
    const session = await Session.createSession(instructor, quiz, quiz_id)
    const code = session.getCode()
    this.active_sessions.set(code, session)
    return code
  }

  async removeSession(code: string): Promise<void> {
    const session = this.getSession(code)
    await session.endSession()
    // Remove a sessão depois de 30 segundos dando esse tempo para que os clientes conectados sejam notificados devidamente
    setTimeout(() => {
      console.log('REMOVING SESSION')
      this.active_sessions.delete(code)
    }, 30 * 1000)
  }

  getSession(code: string): Session {
    const session = this.active_sessions.get(code)
    if (!session) throw new Error('Session not found')
    return session
  }

  instructorEnterSession(code: string, socket: CustomSocket): void {
    const session = this.getSession(code)
    session.connectInstructor(socket)
  }

  instructorLeaveSession(code: string): void {
    const session = this.getSession(code)
    session.disconnectInstructor()
  }

  async participantEnterSession(
    code: string,
    user: MinUser,
    socket: CustomSocket,
  ): Promise<void> {
    const session = this.getSession(code)
    await session.addParticipant(user)
    session.connectParticipant(user.public_id, socket)
  }

  participantLeaveSession(code: string, user: MinUser): void {
    const session = this.getSession(code)
    session.removeParticipant(user)
    session.disconnectParticipant(user.public_id)
  }

  async startSession(code: string): Promise<void> {
    const session = this.getSession(code)
    await session.start()
  }

  async sessionNextStep(code: string): Promise<void> {
    const session = this.getSession(code)
    const is_end_session = await session.nextStep()
    if (is_end_session) await this.removeSession(code)
  }
}
