import { config } from '../config/env.js'
import { LoggedUserTokens } from '../entities/user/services.js'
import { generateUserAccessToken, verifyToken } from './token.js'
import HttpRequestError from '../utils/error.js'
import { MinUser } from '../entities/user/type.js'
import userModel from '../entities/user/model.js'

export async function refreshAccessToken(
  refresh_token: string,
): Promise<LoggedUserTokens> {
  const token = verifyToken(refresh_token, config.auth.REFRESH_TOKEN_SECRET)
  if (!token.valid) {
    throw new HttpRequestError({
      status_code: 401,
      message: token.error,
    })
  }
  const user = token.decoded as MinUser
  const dbUser = await userModel.findMinUserByPublicId(user.public_id)
  if (!dbUser)
    throw new HttpRequestError({
      status_code: 400,
      message: 'User not found',
    })
  return {
    refresh_token,
    access_token: generateUserAccessToken(dbUser),
  }
}

export function userVerify(user: MinUser | null | undefined): asserts user is MinUser {
  if(!user)
    throw new HttpRequestError({
      status_code: 401,
      message: 'Unauthorized'
    })
}

const authService = {
  refreshAccessToken,
}

export default authService
