// types & utils
import {
  formatMs,
  formatCls,
  formatScore,
  msDeltaLabel,
  clsDeltaLabel,
  formatTimestamp,
  scoreDeltaLabel,
} from "./primitives.js";
import { AuditComparison } from "../storage/types.js";

const buildRegressionSummary = (
  deltas: AuditComparison["deltas"],
): string[] => {
  const items: string[] = [];
  if (deltas.performanceScore !== null && deltas.performanceScore < -5)
    items.push(
      `Performance score dropped by ${Math.abs(deltas.performanceScore)} points`,
    );
  if (deltas.accessibilityScore !== null && deltas.accessibilityScore < -5)
    items.push(
      `Accessibility score dropped by ${Math.abs(deltas.accessibilityScore)} points`,
    );
  if (deltas.bestPracticesScore !== null && deltas.bestPracticesScore < -5)
    items.push(
      `Best Practices score dropped by ${Math.abs(deltas.bestPracticesScore)} points`,
    );
  if (deltas.seoScore !== null && deltas.seoScore < -5)
    items.push(`SEO score dropped by ${Math.abs(deltas.seoScore)} points`);
  if (deltas.lcp !== null && deltas.lcp > 200)
    items.push(
      `LCP increased by ${Math.round(deltas.lcp)}ms (page loads slower)`,
    );
  if (deltas.tbt !== null && deltas.tbt > 50)
    items.push(
      `TBT increased by ${Math.round(deltas.tbt)}ms (main thread more blocked)`,
    );
  if (deltas.cls !== null && deltas.cls > 0.01)
    items.push(`CLS increased by ${deltas.cls.toFixed(3)} (more layout shift)`);
  return items;
};

const buildImprovementSummary = (
  deltas: AuditComparison["deltas"],
): string[] => {
  const items: string[] = [];
  if (deltas.performanceScore !== null && deltas.performanceScore > 5)
    items.push(
      `Performance score improved by ${deltas.performanceScore} points`,
    );
  if (deltas.accessibilityScore !== null && deltas.accessibilityScore > 5)
    items.push(
      `Accessibility score improved by ${deltas.accessibilityScore} points`,
    );
  if (deltas.bestPracticesScore !== null && deltas.bestPracticesScore > 5)
    items.push(
      `Best Practices score improved by ${deltas.bestPracticesScore} points`,
    );
  if (deltas.seoScore !== null && deltas.seoScore > 5)
    items.push(`SEO score improved by ${deltas.seoScore} points`);
  if (deltas.lcp !== null && deltas.lcp < -200)
    items.push(`LCP improved by ${Math.abs(Math.round(deltas.lcp))}ms`);
  if (deltas.tbt !== null && deltas.tbt < -50)
    items.push(`TBT improved by ${Math.abs(Math.round(deltas.tbt))}ms`);
  if (deltas.cls !== null && deltas.cls < -0.01)
    items.push(`CLS improved by ${Math.abs(deltas.cls).toFixed(3)}`);
  return items;
};

export const formatComparison = (
  comparison: AuditComparison,
  baselineBranch: string,
  currentBranch: string,
): string => {
  const { baseline, current, deltas } = comparison;

  const pad = (s: string, len: number) => s.padStart(len);

  const scoreRow = (
    label: string,
    b: number | null,
    c: number | null,
    delta: number | null,
  ) =>
    `| ${label} | ${pad(formatScore(b), 16)} | ${pad(formatScore(c), 16)} | ${pad(scoreDeltaLabel(delta), 14)} |`;

  const metricRow = (
    label: string,
    b: number | null,
    c: number | null,
    delta: number | null,
    isCls = false,
  ) => {
    const bFmt = isCls ? formatCls(b) : formatMs(b);
    const cFmt = isCls ? formatCls(c) : formatMs(c);
    const dFmt = isCls ? clsDeltaLabel(delta) : msDeltaLabel(delta);
    return `| ${label} | ${pad(bFmt, 10)} | ${pad(cFmt, 10)} | ${pad(dFmt, 11)} |`;
  };

  const lines: string[] = [
    `| Category       | ${pad(baselineBranch, 16)} | ${pad(currentBranch, 16)} | Delta          |`,
    `|----------------|${"-".repeat(18)}|${"-".repeat(18)}|----------------|`,
    scoreRow(
      "Performance   ",
      baseline.performanceScore,
      current.performanceScore,
      deltas.performanceScore,
    ),
    scoreRow(
      "Accessibility ",
      baseline.accessibilityScore,
      current.accessibilityScore,
      deltas.accessibilityScore,
    ),
    scoreRow(
      "Best Practices",
      baseline.bestPracticesScore,
      current.bestPracticesScore,
      deltas.bestPracticesScore,
    ),
    scoreRow(
      "SEO           ",
      baseline.seoScore,
      current.seoScore,
      deltas.seoScore,
    ),
    "",
    `| Metric      | ${pad(baselineBranch, 10)} | ${pad(currentBranch, 10)} | Delta       |`,
    `|-------------|${"-".repeat(12)}|${"-".repeat(12)}|-------------|`,
    metricRow("LCP        ", baseline.lcp, current.lcp, deltas.lcp),
    metricRow("FCP        ", baseline.fcp, current.fcp, deltas.fcp),
    metricRow("TBT        ", baseline.tbt, current.tbt, deltas.tbt),
    metricRow("CLS        ", baseline.cls, current.cls, deltas.cls, true),
    metricRow(
      "Speed Index",
      baseline.speedIndex,
      current.speedIndex,
      deltas.speedIndex,
    ),
    "",
    "### Audit Sources",
    `Baseline audit: ${formatTimestamp(baseline.timestamp)}${baseline.gitCommit ? ` (commit: ${baseline.gitCommit.slice(0, 7)})` : ""}`,
    `Current audit:  ${formatTimestamp(current.timestamp)}${current.gitCommit ? ` (commit: ${current.gitCommit.slice(0, 7)})` : ""}`,
  ];

  const regressions = buildRegressionSummary(deltas);
  if (regressions.length > 0) {
    lines.push("", "### ⚠️ Regressions", ...regressions.map((r) => `- ${r}`));
  }

  const improvements = buildImprovementSummary(deltas);
  if (improvements.length > 0) {
    lines.push("", "### ✅ Improvements", ...improvements.map((i) => `- ${i}`));
  }

  return lines.join("\n");
};
