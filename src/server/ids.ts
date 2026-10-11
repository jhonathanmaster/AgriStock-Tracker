import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 20-character random id, the same shape Firestore used, so old and new ids look alike. */
export function newId(): string {
  const bytes = crypto.randomBytes(20);
  let out = '';
  for (let i = 0; i < 20; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
