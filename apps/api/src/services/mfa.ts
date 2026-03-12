import { TOTP, Secret } from "otpauth";
import crypto from "crypto";

const ISSUER = "Ecommerce";
const ALGORITHM = "aes-256-gcm";

export interface MfaSecretResult {
  secret: string;
  uri: string;
}

// ─── Encryption helpers ─────────────────────────────────────────────────────

export function encryptSecret(plaintext: string, encryptionKey: string): string {
  const key = crypto.scryptSync(encryptionKey, "mfa-salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptSecret(encrypted: string, encryptionKey: string): string {
  const [ivHex, authTagHex, data] = encrypted.split(":");
  if (!ivHex || !authTagHex || !data) throw new Error("Invalid encrypted format");
  const key = crypto.scryptSync(encryptionKey, "mfa-salt", 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ─── TOTP helpers ───────────────────────────────────────────────────────────

export async function generateMfaSecret(email: string): Promise<MfaSecretResult> {
  const totp = new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyMfaCode(encryptedOrPlainSecret: string, code: string, encryptionKey?: string): boolean {
  const secret = encryptionKey
    ? decryptSecret(encryptedOrPlainSecret, encryptionKey)
    : encryptedOrPlainSecret;

  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}
