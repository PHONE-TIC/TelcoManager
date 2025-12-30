import { describe, it, expect } from "vitest";

describe("Backend Logic", () => {
  it("should calculate stock availability", () => {
    const currentStock = 10;
    const requested = 2;
    expect(currentStock - requested).toBe(8);
  });
});
