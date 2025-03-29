import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import axios from 'axios'
import xmlbuilder from 'xmlbuilder'
import { CreateUserPayload, SessionPlayer } from '../../entities/user/type'
import { JWKS, LTIServices } from '../services'
import { signMessage, verifyMessage, verifyMessageOnISS } from './jwt'
import moodleUris from './links'
import { LTI_REDIRECT_URL } from '../constants'
import {
  getUserPayloadSchema,
  GradesToken,
  MoodleUser,
  startLauchPayloadSchema,
  StartLaunchPayload,
} from './types'
import { getUserRole } from '../../entities/user/services'

export class MoodleLTIServices implements LTIServices {
  async startLaunch(payload: unknown): Promise<string> {
    const parsedPayload = startLauchPayloadSchema.parse(payload)
    const {
      iss,
      target_link_uri,
      login_hint,
      lti_message_hint,
      client_id,
      lti_deployment_id,
    } = parsedPayload
    const state = await signMessage({
      iss,
      target_link_uri,
      login_hint,
      lti_message_hint,
      client_id,
      lti_deployment_id,
    })
    const moodleOidcUrl = moodleUris(iss).auth
    const nonce = randomBytes(16).toString('hex')
    const redirectUrl =
      `${moodleOidcUrl}?` +
      `client_id=${encodeURIComponent(client_id)}&` +
      `redirect_uri=${encodeURIComponent(LTI_REDIRECT_URL)}&` +
      `response_type=id_token&` +
      `scope=openid&` +
      `state=${encodeURIComponent(state)}&` +
      `login_hint=${encodeURIComponent(login_hint)}&` +
      `lti_message_hint=${encodeURIComponent(lti_message_hint)}&` +
      `nonce=${encodeURIComponent(nonce)}&` +
      `response_mode=form_post`

    return redirectUrl
  }

  private formatUser(moodleUser: MoodleUser): CreateUserPayload {
    return {
      name: moodleUser.name,
      locale:
        moodleUser[
          'https://purl.imsglobal.org/spec/lti/claim/launch_presentation'
        ].locale,
      role: getUserRole(
        moodleUser['https://purl.imsglobal.org/spec/lti/claim/roles'],
      ),
      lms: {
        iss: moodleUser.iss,
        platform: 'moodle',
        client_id: moodleUser.aud,
        version:
          moodleUser['https://purl.imsglobal.org/spec/lti/claim/version'],
        user_id: moodleUser.sub,
        outcome: {
          source_id:
            moodleUser[
              'https://purl.imsglobal.org/spec/lti-bo/claim/basicoutcome'
            ].lis_result_sourcedid,
          service_url:
            moodleUser[
              'https://purl.imsglobal.org/spec/lti-bo/claim/basicoutcome'
            ].lis_outcome_service_url,
        },
      },
    }
  }

  async getUser(payload: unknown): Promise<CreateUserPayload> {
    const parsedPayload = getUserPayloadSchema.parse(payload)
    const state = (await verifyMessage(
      parsedPayload.state,
    )) as StartLaunchPayload
    const user = (await verifyMessageOnISS(
      parsedPayload.id_token,
      state.iss,
    )) as MoodleUser
    return this.formatUser(user)
  }

  async getJWKSKeys(): Promise<JWKS> {
    const jwks_keys_filepath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'keys',
      'jwks_public.json',
    )
    try {
      const keysFile = await fs.promises.readFile(jwks_keys_filepath, 'utf8')
      return JSON.parse(keysFile) as JWKS
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  private async generateClientAssertion(
    tokenEndpoint: string,
    clientId: string,
  ): Promise<string> {
    const keys = await this.getJWKSKeys()
    const payload = {
      iss: clientId,
      sub: clientId,
      aud: tokenEndpoint,
    }
    return await signMessage(payload, {
      header: { alg: 'RS256', kid: keys.keys[0].kid },
    })
  }

  private async getAccessToken(
    iss: string,
    clientId: string,
  ): Promise<GradesToken> {
    const tokenEndpoint = moodleUris(iss).token
    const clientAssertion = await this.generateClientAssertion(
      tokenEndpoint,
      clientId,
    )

    const params = new URLSearchParams()
    params.append('grant_type', 'client_credentials')
    params.append('client_id', clientId)
    params.append(
      'client_assertion_type',
      'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    )
    params.append('client_assertion', clientAssertion)
    params.append(
      'scope',
      'https://purl.imsglobal.org/spec/lti-bo/scope/basicoutcome',
    )

    try {
      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      return response.data as GradesToken
    } catch (error) {
      console.error('Error getting moodle access token', error)
      throw error
    }
  }

  async sendGrade(session_players: SessionPlayer[]): Promise<void> {
    if (!session_players.length) return
    const token = await this.getAccessToken(
      session_players[0].lms_iss,
      session_players[0].lms_client_id,
    )
    const requests = []
    for (const player of session_players) {
      const body = this.getXMLGradesBody(player)
      requests.push(axios.post(player.lms_outcome_service_url, body, {
        headers: {
          'Content-Type': 'application/xml',
          Authorization: `${token.token_type} ${token.access_token}`,
        },
      }))
    }
    await Promise.all(requests)
  }

  private getXMLGradesBody(player: SessionPlayer): string {
    const body = xmlbuilder.create('imsx_POXEnvelopeRequest', { encoding: 'UTF-8' })
    .ele('imsx_POXHeader')
      .ele('imsx_POXRequestHeaderInfo')
        .ele('imsx_version', 'V1.0').up()
        .ele('imsx_messageIdentifier', String(Date.now())).up()
      .up()
    .up()
    .ele('imsx_POXBody')
      .ele('replaceResultRequest')
        .ele('resultRecord')
          .ele('sourcedGUID')
            .ele('sourcedId', player.lms_outcome_source_id).up()
          .up()
          .ele('result')
            .ele('resultScore')
              .ele('textString', player.grade).up()
            .up()
          .up()
        .up()
      .up()
    .up()
    .end()
    return body.toString()
  }
}
