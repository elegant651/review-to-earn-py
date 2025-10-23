import { describe, expect, it } from "vitest";
import { rewardPayloadSchema } from "./index";

describe("rewardPayloadSchema", () => {
  it("accepts valid payloads", () => {
    const result = rewardPayloadSchema.safeParse({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      reviewHash: "abc123",
      score: {
        quality: 85,
        spam: 10,
        sentiment: 70,
        explanation: "Looks good"
      }
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid addresses", () => {
    const result = rewardPayloadSchema.safeParse({
      address: "0x123",
      reviewHash: "abc123",
      score: {
        quality: 85,
        spam: 10,
        sentiment: 70,
        explanation: "Looks good"
      }
    });
    expect(result.success).toBe(false);
  });
});
