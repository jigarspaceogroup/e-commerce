import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock otpauth before import
vi.mock("otpauth", () => {
  const TOTPMock = vi.fn(function (this: Record<string, unknown>) {
    this.secret = { base32: "JBSWY3DPEHPK3PXP" };
    this.toString = () => "otpauth://totp/Ecommerce:admin@test.com?secret=JBSWY3DPEHPK3PXP&issuer=Ecommerce";
    this.validate = ({ token }: { token: string }) => (token === "123456" ? 0 : null);
  });
  return {
    TOTP: TOTPMock,
    Secret: { fromBase32: vi.fn(() => ({ base32: "JBSWY3DPEHPK3PXP" })) },
  };
});

import { generateMfaSecret, verifyMfaCode, encryptSecret, decryptSecret } from "../../services/mfa.js";

describe("MFA Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMfaSecret", () => {
    it("returns a secret and URI", async () => {
      const result = await generateMfaSecret("admin@test.com");
      expect(result.secret).toBeDefined();
      expect(result.uri).toContain("otpauth://");
    });
  });

  describe("verifyMfaCode", () => {
    it("returns true for valid code", () => {
      const result = verifyMfaCode("JBSWY3DPEHPK3PXP", "123456");
      expect(result).toBe(true);
    });

    it("returns false for invalid code", () => {
      const result = verifyMfaCode("JBSWY3DPEHPK3PXP", "000000");
      expect(result).toBe(false);
    });
  });

  describe("encryptSecret / decryptSecret", () => {
    it("encrypts and decrypts a secret correctly", () => {
      const key = "this-is-a-32-char-encryption-key!!";
      const plaintext = "JBSWY3DPEHPK3PXP";
      const encrypted = encryptSecret(plaintext, key);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(":");
      const decrypted = decryptSecret(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertext each time (random IV)", () => {
      const key = "this-is-a-32-char-encryption-key!!";
      const plaintext = "JBSWY3DPEHPK3PXP";
      const enc1 = encryptSecret(plaintext, key);
      const enc2 = encryptSecret(plaintext, key);
      expect(enc1).not.toBe(enc2);
    });

    it("fails with wrong key", () => {
      const key = "this-is-a-32-char-encryption-key!!";
      const wrongKey = "wrong-key-that-is-also-32-chars!!";
      const encrypted = encryptSecret("JBSWY3DPEHPK3PXP", key);
      expect(() => decryptSecret(encrypted, wrongKey)).toThrow();
    });
  });
});
