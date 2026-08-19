/**
 * Security utilities for the application.
 * Uses Web Crypto API (browser-native) for password hashing.
 */

/**
 * Hash a password using SHA-256 with a salt prefix.
 * @param {string} password - The plain text password
 * @returns {Promise<string>} - The hex-encoded SHA-256 hash
 */
export async function hashPassword(password) {
  const salt = 'seguro_app_salt_2026';
  const data = new TextEncoder().encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a stored hash.
 * @param {string} password - The plain text password to verify
 * @param {string} storedHash - The stored hash to compare against
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, storedHash) {
  const hash = await hashPassword(password);
  return hash === storedHash;
}

/**
 * Create a safe user object for localStorage (without sensitive data).
 * @param {object} user - The full user object from database
 * @returns {object} - User object without password
 */
export function sanitizeUserForStorage(user) {
  if (!user) return null;
  const { senha, ...safeUser } = user;
  return safeUser;
}
