import { describe, it, expect } from "vitest";

// utils
import {
  formatMetrics,
  formatScoreTable,
} from "../../src/utils/format-scores.js";
import { ScoreSet, MetricSet } from "../../src/utils/primitives.js";

const scores: ScoreSet = {
  seo: 92,
  performance: 78,
  accessibility: 95,
  bestPractices: 83,
};

const metrics: MetricSet = {
  fcp: 890,
  tbt: 310,
  lcp: 2450,
  cls: 0.08,
  speedIndex: 3100,
};

describe("formatScoreTable", () => {
  it("simple mode — no third column", () => {
    const output = formatScoreTable(scores);

    expect(output).toContain("| Category       | Score |");
    expect(output).not.toContain("Grade");
    expect(output).not.toContain("Trend");
    expect(output).toContain("78");
    expect(output).toContain("95");
  });

  it("grade mode — shows emoji", () => {
    const output = formatScoreTable(scores, { mode: "grade" });

    expect(output).toContain("Grade");
    expect(output).toContain("🟡");
    expect(output).toContain("🟢");
  });

  it("trend mode — shows delta vs previous", () => {
    const previous: ScoreSet = {
      performance: 72,
      accessibility: 95,
      bestPractices: 85,
      seo: 92,
    };
    const output = formatScoreTable(scores, { mode: "trend", previous });

    expect(output).toContain("Trend");
    expect(output).toContain("+6 ⬆️");
    expect(output).toContain("-2 ⬇️");
    expect(output).toContain("—");
  });

  it("trend mode with no previous — shows — for all trends", () => {
    const output = formatScoreTable(scores, { mode: "trend" });

    expect(output).toContain("Trend");
    const trendRows = output.split("\n").slice(2);
    trendRows.forEach((row) => expect(row).toContain("—"));
  });

  it("handles null scores gracefully", () => {
    const nullScores: ScoreSet = {
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
    };
    const output = formatScoreTable(nullScores, { mode: "grade" });

    expect(output).toContain("⚪");
  });
});

describe("formatMetrics", () => {
  it("table mode — includes header and rows", () => {
    const output = formatMetrics(metrics);

    expect(output).toContain("| Metric      | Value    |");
    expect(output).toContain("LCP");
    expect(output).toContain("2,450ms");
    expect(output).toContain("0.080");
    expect(output).not.toContain("Trend");
  });

  it("table mode with previous — shows trend column", () => {
    const previous: MetricSet = {
      lcp: 2800,
      fcp: 890,
      tbt: 400,
      cls: 0.08,
      speedIndex: 3100,
    };
    const output = formatMetrics(metrics, { previous });

    expect(output).toContain("Trend");
    expect(output).toContain("-350ms ⬆️");
    expect(output).toContain("-90ms ⬆️");
    expect(output).toContain("—");
  });

  it("list mode — renders bullet list with pass/fail", () => {
    const output = formatMetrics(metrics, { mode: "list" });

    expect(output).toContain("- **LCP**");
    expect(output).toContain("2,450ms ✅");
    expect(output).toContain("310ms ❌");
    expect(output).toContain("0.080 ✅");
    expect(output).not.toContain("|");
  });

  it("list mode — LCP > 2500 shows ❌", () => {
    const slowMetrics: MetricSet = { ...metrics, lcp: 3000 };
    const output = formatMetrics(slowMetrics, { mode: "list" });

    expect(output).toContain("3,000ms ❌");
  });

  it("handles null metrics", () => {
    const nullMetrics: MetricSet = {
      lcp: null,
      fcp: null,
      tbt: null,
      cls: null,
      speedIndex: null,
    };
    const output = formatMetrics(nullMetrics, { mode: "list" });

    expect(output).toContain("- **LCP** —");
  });
});
