import { Prisma } from '@prisma/client'
import { CreateUserPayload, MinUser, UserLMSData } from './type'
import prisma from '../../config/db'
import { getValidatedUserRole } from './services'

export async function findMinUserByPublicId(
  public_id: string,
): Promise<MinUser | null> {
  const dbUser = await prisma.user.findUnique({
    where: {
      public_id: public_id,
    },
    select: {
      id: true,
      public_id: true,
      name: true,
      role: true,
    },
  })
  if (!dbUser) return null
  return {
    id: dbUser.id,
    public_id: dbUser.public_id,
    name: dbUser.name,
    role: getValidatedUserRole(dbUser.role),
  }
}

export async function findUserByLMSId(
  user: CreateUserPayload,
): Promise<Prisma.UserGetPayload<object> | null> {
  return await prisma.user.findFirst({
    where: {
      lms_iss: user.lms.iss,
      lms_user_id: user.lms.user_id,
    },
  })
}

export async function getUserIdByPublicId(public_id: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { public_id },
    select: { id: true },
  })
  if (!user) throw Error('User not found')
  return user.id
}

export async function createUser(user: CreateUserPayload): Promise<MinUser> {
  const dbUser = await prisma.user.create({
    data: {
      name: user.name,
      role: user.role,
      locale: user.locale,
      lms_iss: user.lms.iss,
      lms_platform: user.lms.platform,
      lms_user_id: user.lms.user_id,
      lms_version: user.lms.version,
      lms_client_id: user.lms.client_id,
      lms_outcome_source_id: user.lms.outcome.source_id,
      lms_outcome_service_url: user.lms.outcome.service_url,
    },
  })
  return {
    id: dbUser.id,
    public_id: dbUser.public_id,
    name: dbUser.name,
    role: getValidatedUserRole(dbUser.role),
  }
}

export async function updateUserByLMSId(
  user: CreateUserPayload,
): Promise<MinUser> {
  const dbUser = await prisma.user.update({
    where: {
      lms_iss_lms_user_id: {
        lms_iss: user.lms.iss,
        lms_user_id: user.lms.user_id,
      },
    },
    data: {
      name: user.name,
      role: user.role,
      locale: user.locale,
      lms_platform: user.lms.platform,
      lms_version: user.lms.version,
      lms_client_id: user.lms.client_id,
      lms_outcome_source_id: user.lms.outcome.source_id,
      lms_outcome_service_url: user.lms.outcome.service_url,
    },
  })
  return {
    id: dbUser.id,
    public_id: dbUser.public_id,
    name: dbUser.name,
    role: getValidatedUserRole(dbUser.role),
  }
}

export async function updateUserRefreshTokenByPublicId(
  public_id: string,
  refresh_token: string,
): Promise<void> {
  await prisma.user.update({
    where: { public_id: public_id },
    data: { auth_refresh_token: refresh_token },
  })
}

export async function getUserLMSDataById(id: number): Promise<UserLMSData> {
  return await prisma.user.findFirstOrThrow({
    where: { id },
    select: {
      lms_iss: true,
      lms_platform: true,
      lms_user_id: true,
      lms_version: true,
      lms_client_id: true,
      lms_outcome_source_id: true,
      lms_outcome_service_url: true,
    },
  })
}

const userModel = {
  findMinUserByPublicId,
  findUserByLMSId,
  getUserIdByPublicId,
  createUser,
  updateUserByLMSId,
  updateUserRefreshTokenByPublicId,
  getUserLMSDataById,
}

export default userModel
