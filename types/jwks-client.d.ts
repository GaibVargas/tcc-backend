declare module 'jwks-client' {
  type Key = {
    kid: string
    publicKey: string
    rsaPublicKey?: string
  }
  type JWKSClient = {
    getSigningKey: (
      kid: string | undefined,
      callback: (err: null | Error, key: Key) => void,
    ) => void
  }
  type JWKSPayload = {
    jwksUri: string
  }

  export default function jwksClient(payload: JWKSPayload): JWKSClient
}
