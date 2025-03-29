import { z } from 'zod'

export type MoodleUser = {
  nonce: string //'a9bc123994825af7e672e0a09302cf31'
  iat: number // 1737827298
  exp: number // 1737827358
  iss: string // 'http://localhost/moodle'
  aud: string // 'PcHzbGjgk4Vi8Pn'
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string // '6'
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string // 'http://localhost:3333'
  sub: string // '3'
  'https://purl.imsglobal.org/spec/lti/claim/lis': {
    person_sourcedid: string // ''
    course_section_sourcedid: string // ''
  }
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[] // [ 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor' ];
  'https://purl.imsglobal.org/spec/lti/claim/context': {
    id: string // '2'
    label: string // 'LTI'
    title: string // 'Curso LTI'
    type: string[] // [ 'CourseSection' ]
  }
  'https://purl.imsglobal.org/spec/lti/claim/message_type': string // 'LtiResourceLinkRequest'
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
    title: string // 'LTI Quiz Final'
    description: string // ''
    id: string // '5'
  }
  'https://purl.imsglobal.org/spec/lti-bo/claim/basicoutcome': {
    lis_result_sourcedid: string // '{"data":{"instanceid":"5","userid":"3","typeid":"6","launchid":1154622859},"hash":"23c4b5ce773fac8aa52244c07e7b5146276c6b14b6e4be7af20a4fd411503c31"}'
    lis_outcome_service_url: string // 'http://localhost/moodle/mod/lti/service.php'
  }
  given_name: string // 'Professor'
  family_name: string // 'Usuário'
  name: string // 'Professor Usuário'
  'https://purl.imsglobal.org/spec/lti/claim/ext': {
    user_username: string // 'professor'
    lms: string // 'moodle-2'
  }
  email: string // 'gabriel.vargas.coelho@gmail.com'
  'https://purl.imsglobal.org/spec/lti/claim/launch_presentation': {
    locale: string // 'pt_br'
    document_target: string // 'iframe'
    return_url: string // 'http://localhost/moodle/mod/lti/return.php?course=2&launch_container=3&instanceid=5&sesskey=4FvUBg3jMP'
  }
  'https://purl.imsglobal.org/spec/lti/claim/tool_platform': {
    product_family_code: string // 'moodle'
    version: string // '2022112813.02'
    guid: string // 'localhost'
    name: string // 'local'
    description: string // 'Moodle Local'
  }
  'https://purl.imsglobal.org/spec/lti/claim/version': string // '1.3.0'
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
    scope: string[] // [
    // 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
    // 'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
    // 'https://purl.imsglobal.org/spec/lti-ags/scope/score'
    //]
    lineitems: string // 'http://localhost/moodle/mod/lti/services.php/2/lineitems?type_id=6'
    lineitem: string // 'http://localhost/moodle/mod/lti/services.php/2/lineitems/8/lineitem?type_id=6'
  }
}

export const startLauchPayloadSchema = z.object({
  iss: z.string(),
  target_link_uri: z.string().url(),
  login_hint: z.string(),
  lti_message_hint: z.string(),
  client_id: z.string(),
  lti_deployment_id: z.string(),
})

export type StartLaunchPayload = z.infer<typeof startLauchPayloadSchema>

export const getUserPayloadSchema = z.object({
  id_token: z.string(),
  state: z.string(),
})

export type GetUserPayload = z.infer<typeof getUserPayloadSchema>

export type GradesToken = {
  access_token: string
  token_type: string
  expires_in: string
  scope: string
}
