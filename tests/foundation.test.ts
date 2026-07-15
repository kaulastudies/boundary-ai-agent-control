import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("repository foundation", () => {
  it("runs strict runtime schema validation", () => {
    const stageSchema = z.literal("foundation");

    expect(stageSchema.parse("foundation")).toBe("foundation");
  });
});
