import { FastifyReply, FastifyRequest } from 'fastify'
import { JWKS, LTIServices } from './services'
import { getUserAuthToken, updateOrCreateUser } from '../entities/user/services'
import { config } from '../config/env'

export default class LTIControllers {
  private ltiService: LTIServices

  constructor(ltiService: LTIServices) {
    this.ltiService = ltiService
  }

  async startLauch(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const LTI_REDIRECT_URL = await this.ltiService.startLaunch(req.body)
    reply.redirect(LTI_REDIRECT_URL)
  }

  async login(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const ltiUser = await this.ltiService.getUser(req.body)
    const user = await updateOrCreateUser(ltiUser)
    const auth_token = getUserAuthToken(user)
    reply.redirect(`${config.host.FRONTEND_URL}/auth/${auth_token}`)
  }

  async getJWKS(_req: FastifyRequest, _reply: FastifyReply): Promise<JWKS> {
    const keys = await this.ltiService.getJWKSKeys()
    return keys
  }
}
