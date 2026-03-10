import { describe, it, expect } from "vitest";
import { generateSlug } from "../slug";

describe("generateSlug", () => {
  it("converts English text to lowercase slug", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("handles Arabic text", () => {
    const slug = generateSlug("هاتف ذكي");
    expect(slug).toBe("هاتف-ذكي");
  });

  it("removes special characters", () => {
    expect(generateSlug("Hello, World! #2024")).toBe("hello-world-2024");
  });

  it("collapses multiple hyphens", () => {
    expect(generateSlug("hello   world")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", () => {
    expect(generateSlug("  hello world  ")).toBe("hello-world");
  });

  it("handles mixed Arabic and English", () => {
    const slug = generateSlug("iPhone 15 آيفون");
    expect(slug).toBe("iphone-15-آيفون");
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });
});
