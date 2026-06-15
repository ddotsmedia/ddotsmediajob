import { generateSecret, generateURI, verify as otpVerify } from 'otplib';
import bcrypt from 'bcryptjs';

// Uses the global Web Crypto API (crypto.subtle / crypto.getRandomValues) rather
// than node:crypto, so this module stays bundlable for the edge middleware that
// imports the auth config. Available in both Node 20+ and the edge runtime.

const ISSUER = 'DdotsMediaJobs';
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s);
}
function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Derive a 32-byte AES-GCM key from AUTH_SECRET (SHA-256). */
async function encKey(): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(process.env.AUTH_SECRET ?? ''));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Encrypt a TOTP secret at rest: AES-256-GCM → "iv:ciphertext" (base64). */
export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encKey();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain));
  return `${b64(iv)}:${b64(ct)}`;
}

/** Decrypt a stored TOTP secret. Returns null if malformed or tampered. */
export async function decryptSecret(stored: string): Promise<string | null> {
  try {
    const [ivB64, dataB64] = stored.split(':');
    if (!ivB64 || !dataB64) return null;
    const key = await encKey();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB64) }, key, unb64(dataB64));
    return dec.decode(pt);
  } catch {
    return null;
  }
}

/** Generate a fresh base32 TOTP secret + the otpauth:// URL for QR codes. */
export function generateTotpSecret(accountEmail: string): { secret: string; otpauth: string } {
  const secret = generateSecret();
  const otpauth = generateURI({ issuer: ISSUER, label: accountEmail, secret });
  return { secret, otpauth };
}

/** Verify a 6-digit code against a plaintext secret (±1 step / 30s tolerance). */
export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  try {
    const res = await otpVerify({ secret, token: token.replace(/\s/g, ''), epochTolerance: 30 });
    return res.valid;
  } catch {
    return false;
  }
}

/** Generate 8 one-time backup codes; returns plaintext (show once) + bcrypt hashes (store). */
export async function generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
  const plain = Array.from({ length: 8 }, () => {
    const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_0000_0000;
    return String(n).padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1-$2');
  });
  const hashed = await Promise.all(plain.map((c) => bcrypt.hash(c.replace('-', ''), 10)));
  return { plain, hashed };
}

/**
 * Verify a backup code against stored hashes. Returns the matched hash so the
 * caller can remove it (single-use), or null if no match.
 */
export async function consumeBackupCode(code: string, hashes: string[]): Promise<string | null> {
  const norm = code.replace(/[\s-]/g, '');
  for (const h of hashes) {
    if (await bcrypt.compare(norm, h)) return h;
  }
  return null;
}
