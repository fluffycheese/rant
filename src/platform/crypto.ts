/**
 * Universal password hashing using Web Crypto API (PBKDF2).
 * Works identically on Node.js and Cloudflare Workers.
 *
 * Format: `<hex-salt>:<hex-derived-key>`
 * Parameters: PBKDF2, SHA-256, 600 000 iterations, 32-byte key
 */

const ITERATIONS = 600_000
const KEY_LENGTH = 32 // bytes
const SALT_LENGTH = 16 // bytes

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8, // bits
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const derived = await deriveKey(password, salt)
  return `${toHex(salt.buffer)}:${toHex(derived)}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, keyHex] = storedHash.split(':')
  if (!saltHex || !keyHex) return false

  const salt = fromHex(saltHex)
  const derived = await deriveKey(password, salt)
  const derivedHex = toHex(derived)

  // Constant-time comparison
  if (derivedHex.length !== keyHex.length) return false
  let result = 0
  for (let i = 0; i < derivedHex.length; i++) {
    result |= derivedHex.charCodeAt(i) ^ keyHex.charCodeAt(i)
  }
  return result === 0
}
