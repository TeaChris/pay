import { importPKCS8, importSPKI } from 'jose';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getEnv } from './env.js';

type JWTKey = Awaited<ReturnType<typeof importPKCS8>>;

let _privateKey: JWTKey | undefined;
let _publicKey: JWTKey | undefined;

export async function loadKeys(): Promise<{ privateKey: JWTKey; publicKey: JWTKey }> {
  if (_privateKey && _publicKey) {
    return { privateKey: _privateKey, publicKey: _publicKey };
  }

  const env = getEnv();

  const privatePem = readFileSync(resolve(env.JWT_PRIVATE_KEY_PATH), 'utf-8');
  const publicPem = readFileSync(resolve(env.JWT_PUBLIC_KEY_PATH), 'utf-8');

  _privateKey = await importPKCS8(privatePem, 'ES256');
  _publicKey = await importSPKI(publicPem, 'ES256');

  return { privateKey: _privateKey, publicKey: _publicKey };
}

export function getPrivateKey(): JWTKey {
  if (!_privateKey) throw new Error('Keys not loaded. Call loadKeys() first.');
  return _privateKey;
}

export function getPublicKey(): JWTKey {
  if (!_publicKey) throw new Error('Keys not loaded. Call loadKeys() first.');
  return _publicKey;
}
