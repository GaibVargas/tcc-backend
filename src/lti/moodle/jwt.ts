import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-client'
import moodleUris from './links.js'

type JWTMessage = string | Buffer | object

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function signMessage(
  message: JWTMessage,
  options: jwt.SignOptions = {},
): Promise<string> {
  const privateKeyFilepath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'keys',
    'private_key.pem',
  )
  const privateKey = await fs.promises.readFile(privateKeyFilepath, 'utf8')
  return jwt.sign(message, privateKey, {
    algorithm: 'RS256',
    expiresIn: '5m',
    ...options,
  })
}

export async function verifyMessage(
  message: string,
): Promise<string | jwt.JwtPayload> {
  const publicKeyFilepath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'keys',
    'public_key.pem',
  )
  const publicKey = await fs.promises.readFile(publicKeyFilepath, 'utf8')

  const decoded = jwt.verify(message, publicKey, {
    algorithms: ['RS256'],
  })

  return decoded
}

type JWTVerifyResult = string | jwt.JwtPayload | undefined

export async function verifyMessageOnISS(
  message: string,
  iss: string,
): Promise<JWTVerifyResult> {
  try {
    const decodedMsg = await new Promise<JWTVerifyResult>((resolve, reject) => {
      jwt.verify(
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

export function getISSJWKSKey(iss: string): jwt.GetPublicKeyOrSecret {
  const client = jwksClient({
    jwksUri: moodleUris(iss).certs,
  })
  return (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error(err)
        callback(err)
      } else {
        const signingKey = key.rsaPublicKey || key.publicKey
        callback(null, signingKey)
      }
    })
  }
}
