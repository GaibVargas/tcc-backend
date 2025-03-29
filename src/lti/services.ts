import { CreateUserPayload, SessionPlayer } from '../entities/user/type'

export type JWKSKey = {
  kty: string
  kid: string
  use: string
  alg: string
  e: string
  n: string
}
export type JWKS = {
  keys: JWKSKey[]
}

export interface LTIServices {
  startLaunch(payload: unknown): Promise<string>
  getUser(payload: unknown): Promise<CreateUserPayload>
  sendGrade(session_player: SessionPlayer[]): Promise<void>
  getJWKSKeys(): Promise<JWKS>
}
