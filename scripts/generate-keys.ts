import { exportPKCS8, exportSPKI } from 'jose';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeyPair } from 'node:crypto';
import { promisify } from 'node:util';

const generateKeyPairAsync = promisify(generateKeyPair);

const __dirname = dirname(fileURLToPath(import.meta.url));
const keysDir = join(__dirname, '..', 'keys');

async function main(): Promise<void> {
  if (!existsSync(keysDir)) {
    mkdirSync(keysDir, { recursive: true });
  }

  const privatePath = join(keysDir, 'ec-private.pem');
  const publicPath = join(keysDir, 'ec-public.pem');

  if (existsSync(privatePath) || existsSync(publicPath)) {
    console.error('ERROR: Key files already exist. Delete them first to regenerate.');
    console.error(`  ${privatePath}`);
    console.error(`  ${publicPath}`);
    process.exit(1);
  }

  console.log('Generating ES256 (P-256) key pair...');

  const { publicKey, privateKey } = await generateKeyPairAsync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  writeFileSync(privatePath, privateKey, { mode: 0o600 });
  writeFileSync(publicPath, publicKey, { mode: 0o644 });

  console.log(`Private key written to: ${privatePath}`);
  console.log(`Public key written to:  ${publicPath}`);
  console.log('\nDone. Keep the private key secure and never commit it to version control.');
}

main().catch((err: unknown) => {
  console.error('Key generation failed:', err);
  process.exit(1);
});
