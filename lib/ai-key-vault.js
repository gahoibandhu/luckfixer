// lib/ai-key-vault.js
//
// Encrypts / decrypts API keys that the admin adds through the panel, so they
// are never stored in plain text in Supabase. AES-256-GCM, key derived from the
// KEY_ENCRYPTION_SECRET env var (set it in Vercel — any long random string).
//
// Format stored in DB:  v1:<iv b64>:<authTag b64>:<ciphertext b64>
//
// IMPORTANT: if KEY_ENCRYPTION_SECRET is changed or lost, keys saved with the
// old secret can't be decrypted (they will show as "invalid" and must be
// re-entered). Keep the secret stable.

import crypto from 'crypto';

function getKey() {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('KEY_ENCRYPTION_SECRET env var missing or too short (min 16 chars)');
  }
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
}

export function isVaultConfigured() {
  const s = process.env.KEY_ENCRYPTION_SECRET;
  return !!s && s.length >= 16;
}

export function encryptKey(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptKey(stored) {
  const [ver, ivB64, tagB64, dataB64] = String(stored).split(':');
  if (ver !== 'v1' || !ivB64 || !tagB64 || !dataB64) throw new Error('Bad key format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}

export function lastFour(plain) {
  const s = String(plain || '');
  return s.length <= 4 ? s : s.slice(-4);
}
