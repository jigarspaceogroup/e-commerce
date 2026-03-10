import { describe, it, expect } from "vitest";
import { formatDate } from "../date";

describe("formatDate", () => {
  const testDate = new Date("2026-03-10T12:00:00Z");

  it("formats date in EN locale", () => {
    const result = formatDate(testDate, "en");
    expect(result).toContain("Mar");
    expect(result).toContain("10");
    expect(result).toContain("2026");
  });

  it("formats date in AR locale", () => {
    const result = formatDate(testDate, "ar");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("accepts string date input", () => {
    const result = formatDate("2026-03-10", "en");
    expect(result).toContain("2026");
  });

  it("defaults to EN locale", () => {
    const result = formatDate(testDate);
    expect(result).toContain("Mar");
  });
});
