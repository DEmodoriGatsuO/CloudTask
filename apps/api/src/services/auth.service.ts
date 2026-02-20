import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import { nanoid } from 'nanoid';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateToken(
  userId: string,
  secret: string,
  expirySeconds: number,
): Promise<{ token: string; jti: string }> {
  const jti = nanoid();
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    { sub: userId, jti, iat: now, exp: now + expirySeconds },
    secret,
  );
  return { token, jti };
}

export async function verifyToken(token: string, secret: string) {
  return verify(token, secret, 'HS256');
}

export async function createSession(
  kv: KVNamespace,
  userId: string,
  jti: string,
  ttlSeconds: number,
): Promise<void> {
  await kv.put(`sessions:${userId}:${jti}`, JSON.stringify({ createdAt: Date.now() }), {
    expirationTtl: ttlSeconds,
  });
}

export async function deleteSession(
  kv: KVNamespace,
  userId: string,
  jti: string,
): Promise<void> {
  await kv.delete(`sessions:${userId}:${jti}`);
}
