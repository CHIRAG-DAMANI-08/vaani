import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext API key using AES-256-GCM.
 * Returns a string in format: base64(iv):base64(authTag):base64(ciphertext)
 *
 * The plaintext is NOT retained after this function returns.
 */
export function encryptKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypt an encrypted API key.
 * Input format: base64(iv):base64(authTag):base64(ciphertext)
 *
 * Used in Sprint 6+ when making actual Sarvam API calls.
 */
export function decryptKey(encryptedString: string): string {
  const key = getEncryptionKey();
  const parts = encryptedString.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted key format.");
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
