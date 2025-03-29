declare module 'jwks-client' {
  export type Key = {
    kid: string
    publicKey: string
    rsaPublicKey?: string
  }
  export type JWKSClient = {
    getSigningKey: (
      kid: string | undefined,
      callback: (err: null | Error, key: Key) => void,
    ) => void
  }
  export type JWKSPayload = {
    jwksUri: string
  }

  export default function jwksClient(payload: JWKSPayload): JWKSClient
}
