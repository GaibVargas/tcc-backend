import jose from 'node-jose'
import fs from 'node:fs'
import path from 'node:path'

const dir_name = 'keys'

function createFolder(folder_path: string) {
  if (fs.existsSync(folder_path)) return
  fs.mkdirSync(folder_path, { recursive: true })
  console.info(`Folder ${folder_path} was created`)
}

export async function generateKeys() {
  const keystore = jose.JWK.createKeyStore()
  const key = await keystore.generate('RSA', 2048, { alg: 'RS256', use: 'sig' })
  const publicKey = key.toJSON()
  const privateKeyPEM = key.toPEM(true) // PEM format for private key
  const publicKeyPEM = key.toPEM(false) // PEM format for public key

  createFolder(dir_name)
  fs.writeFileSync(
    path.resolve(dir_name, 'jwks_public.json'),
    JSON.stringify({ keys: [publicKey] }, null, 2),
  )
  fs.writeFileSync(path.resolve(dir_name, 'private_key.pem'), privateKeyPEM)
  fs.writeFileSync(path.resolve(dir_name, 'public_key.pem'), publicKeyPEM)

  console.info('Keys were generated.')
}
