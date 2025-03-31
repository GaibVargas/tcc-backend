import jose from 'node-jose'
import fs from 'node:fs'
import path from 'node:path'

const dir_name = 'keys'

async function generateKeys() {
  // Create a keystore
  const keystore = jose.JWK.createKeyStore()

  // Generate an RSA key pair
  const key = await keystore.generate('RSA', 2048, { alg: 'RS256', use: 'sig' })

  const publicKey = key.toJSON()
  const privateKeyPEM = key.toPEM(true) // PEM format for private key
  const publicKeyPEM = key.toPEM(false) // PEM format for public key

  fs.writeFileSync(
    path.resolve(dir_name, 'jwks_public.json'),
    JSON.stringify({ keys: [publicKey] }, null, 2),
  )
  fs.writeFileSync(path.resolve(dir_name, 'private_key.pem'), privateKeyPEM)
  fs.writeFileSync(path.resolve(dir_name, 'public_key.pem'), publicKeyPEM)
}

generateKeys()
  .then('Keys were generated!')
  .catch(e => console.error('Error generating keys', e))