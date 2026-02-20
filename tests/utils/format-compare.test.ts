import { describe, it, expect } from "vitest";

// utils & types
import { mockAuditBase } from "../fixtures/mock-audit.js";
import { AuditComparison } from "../../src/storage/types.js";
import { formatComparison } from "../../src/utils/format-compare.js";

const baselineAudit = { id: 1, ...mockAuditBase };
const currentAudit = {
  id: 2,
  ...mockAuditBase,
  tbt: 100,
  cls: 0.02,
  lcp: 1800,
  seoScore: 92,
  performanceScore: 88,
  accessibilityScore: 95,
  bestPracticesScore: 75,
};

const comparison: AuditComparison = {
  current: currentAudit,
  baseline: baselineAudit,
  deltas: {
    fcp: 0,
    tbt: -210,
    lcp: -650,
    cls: -0.06,
    seoScore: 0,
    speedIndex: 0,
    performanceScore: 10,
    accessibilityScore: 0,
    bestPracticesScore: -8,
  },
};

describe("formatComparison", () => {
  it("includes both branch names in headers", () => {
    const output = formatComparison(comparison, "main", "feature/perf");

    expect(output).toContain("main");
    expect(output).toContain("feature/perf");
  });

  it("shows score values for both branches", () => {
    const output = formatComparison(comparison, "main", "feature/perf");

    expect(output).toContain("78");
    expect(output).toContain("88");
  });

  it("shows improvements section when present", () => {
    const output = formatComparison(comparison, "main", "feature/perf");

    expect(output).toContain("### ✅ Improvements");
    expect(output).toContain("Performance score improved by 10 points");
    expect(output).toContain("LCP improved by 650ms");
    expect(output).toContain("TBT improved by 210ms");
  });

  it("shows regressions section when present", () => {
    const output = formatComparison(comparison, "main", "feature/perf");

    expect(output).toContain("### ⚠️ Regressions");
    expect(output).toContain("Best Practices score dropped by 8 points");
  });

  it("shows audit sources", () => {
    const output = formatComparison(comparison, "main", "feature/perf");

    expect(output).toContain("### Audit Sources");
    expect(output).toContain("abc1234");
  });

  it("omits improvements section when no improvements", () => {
    const noImprovements: AuditComparison = {
      ...comparison,
      deltas: {
        ...comparison.deltas,
        performanceScore: 3,
        lcp: -100,
        tbt: -20,
        cls: -0.005,
      },
    };
    const output = formatComparison(noImprovements, "main", "feature");

    expect(output).not.toContain("### ✅ Improvements");
  });

  it("omits regressions section when no regressions", () => {
    const noRegressions: AuditComparison = {
      ...comparison,
      deltas: { ...comparison.deltas, bestPracticesScore: -2 },
    };
    const output = formatComparison(noRegressions, "main", "feature");

    expect(output).not.toContain("### ⚠️ Regressions");
  });
});
