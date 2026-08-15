import { createHash, randomBytes } from 'crypto';

export function generateRefreshToken() {
  const token = randomBytes(64).toString('hex');

  const hash = createHash('sha256').update(token).digest('hex');

  // token → se entrega al cliente
  // hash  → se guarda en Session
  return {
    token,
    hash,
  };
}
