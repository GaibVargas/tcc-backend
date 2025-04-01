import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import os from 'node:os'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-client'
import moodleUris from './links.js'

type JWTMessage = string | Buffer | object

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function printFilePermissions(filepath: string): void {
  if (!fs.existsSync(filepath)) {
    console.error("Arquivo NÃO encontrado:", filepath)
  } else {
    console.log("Arquivo encontrado:", filepath)
    fs.stat(filepath, (err, stats) => {
      if (err) {
        console.error("Erro ao obter status do arquivo:", err)
      } else {
        console.log("Permissões:", stats.mode.toString(8))
        console.log("Dono:", stats.uid)
        console.log("Grupo:", stats.gid)
      }
    })
  }
}

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
  console.log('Processo uid', os.userInfo().uid)
  printFilePermissions(privateKeyFilepath)
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
        callback(err)
      } else {
        const signingKey = key.rsaPublicKey || key.publicKey
        callback(null, signingKey)
      }
    })
  }
}
