import bcrypt from 'bcryptjs';

// 12 rounds: OWASP-recommended work factor. Existing 10-round hashes still verify.
const ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
