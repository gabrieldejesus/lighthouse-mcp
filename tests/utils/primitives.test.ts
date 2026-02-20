import { describe, it, expect } from "vitest";

// utils
import {
  formatMs,
  formatCls,
  scoreEmoji,
  scoreBadge,
  formatScore,
  msDeltaLabel,
  clsDeltaLabel,
  formatTimestamp,
  scoreDeltaLabel,
} from "../../src/utils/primitives.js";

describe("formatMs", () => {
  it("returns — for null", () => expect(formatMs(null)).toBe("—"));
  it("formats whole milliseconds", () => expect(formatMs(890)).toBe("890ms"));
  it("rounds decimal values", () => expect(formatMs(890.7)).toBe("891ms"));
  it("adds thousands separator", () => expect(formatMs(2450)).toBe("2,450ms"));
  it("handles zero", () => expect(formatMs(0)).toBe("0ms"));
});

describe("formatScore", () => {
  it("returns — for null", () => expect(formatScore(null)).toBe("—"));
  it("formats integer score", () => expect(formatScore(78)).toBe("78"));
  it("handles 0", () => expect(formatScore(0)).toBe("0"));
  it("handles 100", () => expect(formatScore(100)).toBe("100"));
});

describe("formatCls", () => {
  it("returns — for null", () => expect(formatCls(null)).toBe("—"));
  it("formats to 3 decimal places", () =>
    expect(formatCls(0.08)).toBe("0.080"));
  it("handles zero", () => expect(formatCls(0)).toBe("0.000"));
  it("rounds to 3 places", () => expect(formatCls(0.1234)).toBe("0.123"));
});

describe("formatTimestamp", () => {
  it("formats to YYYY-MM-DD HH:MM", () => {
    const ts = new Date("2026-02-19T14:30:00Z").getTime();
    const result = formatTimestamp(ts);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
  it("has correct length", () => {
    expect(formatTimestamp(Date.now())).toHaveLength(16);
  });
});

describe("scoreEmoji", () => {
  it("returns ⚪ for null", () => expect(scoreEmoji(null)).toBe("⚪"));
  it("returns 🟢 for score >= 90", () => expect(scoreEmoji(90)).toBe("🟢"));
  it("returns 🟢 for score 100", () => expect(scoreEmoji(100)).toBe("🟢"));
  it("returns 🟡 for score 89", () => expect(scoreEmoji(89)).toBe("🟡"));
  it("returns 🟡 for score 50", () => expect(scoreEmoji(50)).toBe("🟡"));
  it("returns 🔴 for score 49", () => expect(scoreEmoji(49)).toBe("🔴"));
  it("returns 🔴 for score 0", () => expect(scoreEmoji(0)).toBe("🔴"));
});

describe("scoreBadge", () => {
  it("returns ⚪ for null", () => expect(scoreBadge(null)).toBe("⚪"));
  it("returns ✅ for score >= 90", () => expect(scoreBadge(95)).toBe("✅"));
  it("returns ⚠️ for score 50-89", () => expect(scoreBadge(75)).toBe("⚠️"));
  it("returns ❌ for score < 50", () => expect(scoreBadge(40)).toBe("❌"));
});

describe("scoreDeltaLabel", () => {
  it("returns — for null", () => expect(scoreDeltaLabel(null)).toBe("—"));
  it("returns — for 0", () => expect(scoreDeltaLabel(0)).toBe("—"));
  it("shows ⬆️ for positive delta", () =>
    expect(scoreDeltaLabel(6)).toBe("+6 ⬆️"));
  it("shows ⬇️ for negative delta", () =>
    expect(scoreDeltaLabel(-3)).toBe("-3 ⬇️"));
});

describe("msDeltaLabel (lowerIsBetter = true)", () => {
  it("returns — for null", () => expect(msDeltaLabel(null)).toBe("—"));
  it("returns — for 0", () => expect(msDeltaLabel(0)).toBe("—"));
  it("shows ⬆️ for negative delta (improvement)", () =>
    expect(msDeltaLabel(-200)).toBe("-200ms ⬆️"));
  it("shows ⬇️ for positive delta (regression)", () =>
    expect(msDeltaLabel(300)).toBe("+300ms ⬇️"));
  it("rounds fractional ms", () =>
    expect(msDeltaLabel(-200.7)).toBe("-201ms ⬆️"));
});

describe("msDeltaLabel (lowerIsBetter = false)", () => {
  it("shows ⬆️ for positive delta", () =>
    expect(msDeltaLabel(200, false)).toBe("+200ms ⬆️"));
  it("shows ⬇️ for negative delta", () =>
    expect(msDeltaLabel(-300, false)).toBe("-300ms ⬇️"));
});

describe("clsDeltaLabel", () => {
  it("returns — for null", () => expect(clsDeltaLabel(null)).toBe("—"));
  it("returns — for 0", () => expect(clsDeltaLabel(0)).toBe("—"));
  it("shows ⬆️ for negative delta (improvement)", () =>
    expect(clsDeltaLabel(-0.05)).toBe("-0.050 ⬆️"));
  it("shows ⬇️ for positive delta (regression)", () =>
    expect(clsDeltaLabel(0.05)).toBe("+0.050 ⬇️"));
});
