import { JwtPayload, sign, SignOptions, verify } from 'jsonwebtoken'
import ms from 'ms'
import { MinUser } from '../entities/user/type'
import { config } from '../config/env'

function generateToken(
  payload: string | Buffer | object,
  secret: string,
  options: SignOptions = {},
): string {
  return sign(payload, secret, options)
}

type TokenExpiration = number | ms.StringValue

export function generateUserAccessToken(user: MinUser): string {
  return generateToken(user, config.auth.ACCESS_TOKEN_SECRET, {
    expiresIn: (config.auth.ACCESS_TOKEN_EXPIRATION as TokenExpiration),
  })
}

export function generateUserRefreshToken(user: MinUser): string {
  return generateToken(user, config.auth.REFRESH_TOKEN_SECRET, {
    expiresIn: (config.auth.REFRESH_TOKEN_EXPIRATION as TokenExpiration),
  })
}

export function generateUserAuthToken(user: MinUser): string {
  return generateToken(user, config.auth.AUTH_TOKEN_SECRET, {
    expiresIn: (config.auth.AUTH_TOKEN_EXPIRATION as TokenExpiration),
  })
}

interface VerifyTokenValidResult {
  valid: true
  decoded: JwtPayload | string
}

interface VerifyTokenInvalidResult {
  valid: false
  error: string
}

type VerifyTokenResult = VerifyTokenValidResult | VerifyTokenInvalidResult

export function verifyToken(token: string, secret: string): VerifyTokenResult {
  try {
    const decoded = verify(token, secret)
    return { valid: true, decoded }
  } catch (error: unknown) {
    if (error instanceof Error && 'name' in error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token has expired' }
      }
    }
    return { valid: false, error: 'Invalid token' }
  }
}
