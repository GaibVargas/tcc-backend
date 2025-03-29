import { z } from 'zod'

export enum UserRoles {
  INSTRUCTOR = 'instructor',
  PARTICIPANT = 'participant',
}
export const rolesSchema = z.nativeEnum(UserRoles)
export type Roles = z.infer<typeof rolesSchema>

const lmsSchema = z.object({
  user_id: z.string(),
  iss: z.string().url(),
  platform: z.enum(['moodle']),
  version: z.string(),
  client_id: z.string(),
  outcome: z.object({
    source_id: z.string(),
    service_url: z.string().url(),
  }),
})

export const userSchema = z.object({
  id: z.number().int(),
  public_id: z.string(),
  name: z.string(),
  role: rolesSchema,
  locale: z.string(),
  lms: lmsSchema,
})
export type User = z.infer<typeof userSchema>

export const createUserPayloadSchema = userSchema.omit({
  id: true,
  public_id: true,
})
export type CreateUserPayload = z.infer<typeof createUserPayloadSchema>

export const minUserSchema = userSchema.pick({
  id: true,
  public_id: true,
  name: true,
  role: true,
})
export type MinUser = z.infer<typeof minUserSchema>

export const userLMSDataSchema = z.object({
  lms_iss: z.string(),
  lms_platform: z.string(),
  lms_user_id: z.string(),
  lms_version: z.string(),
  lms_client_id: z.string(),
  lms_outcome_source_id: z.string(),
  lms_outcome_service_url: z.string(),
})
export type UserLMSData = z.infer<typeof userLMSDataSchema>

export const sessionPlayerSchema = userLMSDataSchema.extend({
  grade: z.number(),
})
export type SessionPlayer = z.infer<typeof sessionPlayerSchema>

export const stubUser: User = {
  id: 1,
  public_id: 'id',
  name: 'Stub',
  role: UserRoles.PARTICIPANT,
  locale: 'pt-br',
  lms: {
    user_id: '1',
    iss: 'http://localhost/moodle',
    platform: 'moodle',
    version: '1.3.0',
    client_id: '1',
    outcome: {
      source_id: 'source_id',
      service_url: 'http://localhost/moodle',
    },
  },
}
