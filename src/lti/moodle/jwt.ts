import fs from 'node:fs'
import {
  GetPublicKeyOrSecret,
  JwtHeader,
  JwtPayload,
  sign,
  SigningKeyCallback,
  SignOptions,
  verify,
} from 'jsonwebtoken'
import jwksClient from 'jwks-client'
import moodleUris from './links'
import { resolve } from 'node:path'

type JWTMessage = string | Buffer | object

export async function signMessage(message: JWTMessage, options: SignOptions = {}): Promise<string> {
  const privateKeyFilepath = resolve(
    __dirname,
    '..',
    '..',
    '..',
    'keys',
    'private_key.pem',
  )
  const privateKey = await fs.promises.readFile(privateKeyFilepath, 'utf8')
  return sign(message, privateKey, {
    algorithm: 'RS256',
    expiresIn: '5m',
    ...options,
  })
}

export async function verifyMessage(
  message: string,
): Promise<string | JwtPayload> {
  const publicKeyFilepath = resolve(
    __dirname,
    '..',
    '..',
    '..',
    'keys',
    'public_key.pem',
  )
  const publicKey = await fs.promises.readFile(publicKeyFilepath, 'utf8')

  const decoded = verify(message, publicKey, {
    algorithms: ['RS256'],
  })

  return decoded
}

type JWTVerifyResult = string | JwtPayload | undefined

export async function verifyMessageOnISS(
  message: string,
  iss: string,
): Promise<JWTVerifyResult> {
  try {
    const decodedMsg = await new Promise<JWTVerifyResult>((resolve, reject) => {
      verify(
        message,
        getISSJWKSKey(iss),
        { algorithms: ['RS256'] },
        (err, decoded) => {
          if (err) reject(err)
          resolve(decoded)
        },
      )
    })
    return decodedMsg
  } catch (error) {
    throw error
  }
}

export function getISSJWKSKey(iss: string): GetPublicKeyOrSecret {
  const client = jwksClient({
    jwksUri: moodleUris(iss).certs,
  })
  return (header: JwtHeader, callback: SigningKeyCallback) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err)
      } else {
        const signingKey = key.rsaPublicKey || key.publicKey
        callback(null, signingKey)
      }
    })
  }
}
