import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Prisma schema", () => {
  it("defines the commercial bead entities", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");

    expect(schema).toContain("model User");
    expect(schema).toContain("model VipPackage");
    expect(schema).toContain("model PaymentOrder");
    expect(schema).toContain("model BeadTask");
    expect(schema).toContain("model AppConfig");
  });
});
