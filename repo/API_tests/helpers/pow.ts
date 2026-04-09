import request from 'supertest';
import { createHash } from 'crypto';

function hasLeadingZeroBits(hash: Buffer, requiredBits: number): boolean {
  let zeroBits = 0;
  for (let i = 0; i < hash.length && zeroBits < requiredBits; i++) {
    const byte = hash[i];
    if (byte === 0) {
      zeroBits += 8;
      continue;
    }
    for (let bit = 7; bit >= 0; bit--) {
      if ((byte & (1 << bit)) === 0) {
        zeroBits++;
      } else {
        return zeroBits >= requiredBits;
      }
    }
  }
  return zeroBits >= requiredBits;
}

function solvePow(prefix: string, difficulty: number): string {
  let nonce = 0;
  while (true) {
    const candidate = String(nonce);
    const hash = createHash('sha256').update(prefix + candidate).digest();
    if (hasLeadingZeroBits(hash, difficulty)) {
      return candidate;
    }
    nonce++;
  }
}

export async function registerWithPow(
  app: any,
  payload: { username: string; password: string; displayName: string },
) {
  const challengeRes = await request(app.getHttpServer()).get('/api/v1/auth/challenge');
  const challengeBody = challengeRes.body.data || challengeRes.body;
  const nonce = solvePow(challengeBody.prefix, challengeBody.difficulty);

  return request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      ...payload,
      challengeId: challengeBody.challengeId,
      nonce,
    });
}
