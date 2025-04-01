import jose from 'node-jose'
import fs from 'node:fs'
import path from 'node:path'

const dir_name = 'keys'

const ignore_folders = ['node_modules', '.git', 'prisma', 'src', 'dist']
function printDirectoryTree(dirPath, indent = '') {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name)
      if (ignore_folders.includes(item.name)) continue
      if (item.isDirectory()) {
        console.log(`${indent}📂 ${item.name}`)
        printDirectoryTree(itemPath, indent + '  ') // Recursão para subpastas
      } else {
        console.log(`${indent}📄 ${item.name}`);
      }
    }
  } catch (err) {
    console.error(`Erro ao acessar ${dirPath}: ${err.message}`)
  }
}

function createFolder(folder_path) {
  if (fs.existsSync(folder_path)) return
  fs.mkdirSync(folder_path, { recursive: true })
  console.info(`Folder ${folder_path} was created`)
}

async function generateKeys() {
  // Create a keystore
  const keystore = jose.JWK.createKeyStore()

  // Generate an RSA key pair
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

  printDirectoryTree(process.cwd())
}

generateKeys()
  .then(() => console.info('Keys script success!'))
  .catch(e => console.error('Error generating keys', e))