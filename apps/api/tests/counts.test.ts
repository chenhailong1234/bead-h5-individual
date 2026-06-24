import { describe, expect, it } from "vitest";
import { applyCredit, deductForTask, refundForTask } from "../src/services/counts";

describe("count accounting", () => {
  it("deducts one regular count for normal tasks", () => {
    const user = { regularCount: 2, memberCount: 5 };

    const result = deductForTask(user, false);

    expect(result.user).toEqual({ regularCount: 1, memberCount: 5 });
    expect(result.deduction).toEqual({ type: "regular", count: 1 });
    expect(user).toEqual({ regularCount: 2, memberCount: 5 });
  });

  it("deducts one ai count for ai tasks", () => {
    const user = { regularCount: 2, memberCount: 5 };

    const result = deductForTask(user, true);

    expect(result.user).toEqual({ regularCount: 2, memberCount: 4 });
    expect(result.deduction).toEqual({ type: "ai", count: 1 });
  });

  it("does not deduct unlimited counts", () => {
    const user = { regularCount: -1, memberCount: -1 };

    expect(deductForTask(user, false).user.regularCount).toBe(-1);
    expect(deductForTask(user, true).user.memberCount).toBe(-1);
  });

  it("throws when no count remains", () => {
    expect(() => deductForTask({ regularCount: 0, memberCount: 1 }, false)).toThrow("NO_REGULAR_COUNT");
    expect(() => deductForTask({ regularCount: 1, memberCount: 0 }, true)).toThrow("NO_AI_COUNT");
  });

  it("refunds the originally deducted count type", () => {
    expect(refundForTask({ regularCount: 0, memberCount: 3 }, "regular", 1)).toEqual({
      regularCount: 1,
      memberCount: 3
    });
    expect(refundForTask({ regularCount: 3, memberCount: 0 }, "ai", 1)).toEqual({
      regularCount: 3,
      memberCount: 1
    });
  });

  it("credits package counts to the correct bucket", () => {
    expect(applyCredit({ regularCount: 1, memberCount: 2 }, "normal", 10)).toEqual({
      regularCount: 11,
      memberCount: 2
    });
    expect(applyCredit({ regularCount: 1, memberCount: 2 }, "ai", 5)).toEqual({
      regularCount: 1,
      memberCount: 7
    });
  });
});
