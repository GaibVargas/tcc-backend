type HttpRequestErrorConstructorPayload = {
  status_code: number
  message: string
}

export default class HttpRequestError extends Error {
  status_code: number
  message: string
  constructor({ status_code, message }: HttpRequestErrorConstructorPayload) {
    super(message)
    this.status_code = status_code
    this.message = message
  }
}
