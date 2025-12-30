import { describe, it, expect } from "vitest";

describe("Validation Logic", () => {
  it("should pass for simple arithmetic", () => {
    expect(1 + 1).toBe(2);
  });

  it("should validate email format", () => {
    const isValidEmail = (email: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
  });
});
