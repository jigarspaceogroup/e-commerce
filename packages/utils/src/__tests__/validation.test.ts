import { describe, it, expect } from "vitest";
import {
  isValidSaudiPhone,
  isValidEmail,
  isValidPassword,
  getPasswordErrors,
} from "../validation";

describe("isValidSaudiPhone", () => {
  it("accepts valid +966 format", () => {
    expect(isValidSaudiPhone("+966501234567")).toBe(true);
  });

  it("accepts valid 05 format", () => {
    expect(isValidSaudiPhone("0501234567")).toBe(true);
  });

  it("rejects invalid country code", () => {
    expect(isValidSaudiPhone("+971501234567")).toBe(false);
  });

  it("rejects too short number", () => {
    expect(isValidSaudiPhone("+96650123")).toBe(false);
  });

  it("rejects too long number", () => {
    expect(isValidSaudiPhone("+9665012345678")).toBe(false);
  });

  it("rejects non-mobile prefix", () => {
    expect(isValidSaudiPhone("+966111234567")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidSaudiPhone("")).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("accepts valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts email with subdomain", () => {
    expect(isValidEmail("user@mail.example.com")).toBe(true);
  });

  it("rejects email without @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects email without domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});

describe("isValidPassword", () => {
  it("accepts valid password (min 8 chars, 1 uppercase, 1 number)", () => {
    expect(isValidPassword("Abcdef1g")).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    expect(isValidPassword("Ab1cdef")).toBe(false);
  });

  it("rejects password without uppercase", () => {
    expect(isValidPassword("abcdefg1")).toBe(false);
  });

  it("rejects password without number", () => {
    expect(isValidPassword("Abcdefgh")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidPassword("")).toBe(false);
  });
});

describe("getPasswordErrors", () => {
  it("returns empty array for valid password", () => {
    expect(getPasswordErrors("Abcdef1g")).toEqual([]);
  });

  it("returns all errors for empty password", () => {
    const errors = getPasswordErrors("");
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it("returns specific error for missing uppercase", () => {
    const errors = getPasswordErrors("abcdefg1");
    expect(errors).toContain("Must contain at least one uppercase letter");
  });
});
