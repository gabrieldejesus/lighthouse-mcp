// types & utils
import {
  formatMs,
  formatScore,
  formatCls,
  formatTimestamp,
} from "./primitives.js";
import { AuditResult } from "../storage/types.js";

const trendArrow = (
  current: number | null,
  previous: number | null,
  lowerIsBetter = false,
): string => {
  if (current === null || previous === null) return "";
  const delta = current - previous;
  if (Math.abs(delta) < 0.5) return "";
  return (lowerIsBetter ? delta < 0 : delta > 0) ? " ⬆️" : " ⬇️";
};

export const formatTrend = (audits: AuditResult[]): string => {
  const header =
    "| # | Date             | Branch          | Commit  | Perf | A11y | BP  | SEO | LCP      | TBT      | CLS   |";
  const divider =
    "|---|------------------|-----------------|---------|------|------|-----|-----|----------|----------|-------|";

  const rows = audits.map((audit, i) => {
    const prev = audits[i + 1] ?? null;
    const perfArrow = trendArrow(
      audit.performanceScore,
      prev?.performanceScore ?? null,
    );
    const lcpArrow = trendArrow(audit.lcp, prev?.lcp ?? null, true);
    const tbtArrow = trendArrow(audit.tbt, prev?.tbt ?? null, true);
    const branch = (audit.gitBranch ?? "—").slice(0, 15);
    const commit = audit.gitCommit ? audit.gitCommit.slice(0, 7) : "—";

    return (
      `| ${String(audits.length - i).padStart(1)} ` +
      `| ${formatTimestamp(audit.timestamp)} ` +
      `| ${branch.padEnd(15)} ` +
      `| ${commit.padEnd(7)} ` +
      `| ${(formatScore(audit.performanceScore) + perfArrow).padEnd(4)} ` +
      `| ${formatScore(audit.accessibilityScore).padEnd(4)} ` +
      `| ${formatScore(audit.bestPracticesScore).padEnd(3)} ` +
      `| ${formatScore(audit.seoScore).padEnd(3)} ` +
      `| ${(formatMs(audit.lcp) + lcpArrow).padEnd(8)} ` +
      `| ${(formatMs(audit.tbt) + tbtArrow).padEnd(8)} ` +
      `| ${formatCls(audit.cls).padEnd(5)} |`
    );
  });

  return [header, divider, ...rows].join("\n");
};
