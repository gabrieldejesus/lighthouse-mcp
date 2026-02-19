// types & utils
import {
  formatMs,
  ScoreSet,
  MetricSet,
  formatCls,
  formatScore,
  scoreEmoji,
  msDeltaLabel,
  clsDeltaLabel,
  scoreDeltaLabel,
} from "./primitives.js";

export const formatScoreTable = (
  scores: ScoreSet,
  options: { mode?: "grade" | "trend" | "simple"; previous?: ScoreSet } = {},
): string => {
  const { mode = "simple", previous } = options;

  const thirdCol =
    mode === "grade" ? "Grade" : mode === "trend" ? "Trend" : null;
  const header = thirdCol
    ? `| Category       | Score | ${thirdCol} |`
    : "| Category       | Score |";
  const divider = thirdCol
    ? "|----------------|-------|-------|"
    : "|----------------|-------|";

  const third = (
    current: number | null,
    prev: number | null | undefined,
  ): string => {
    if (mode === "grade") return scoreEmoji(current);
    if (mode === "trend") {
      if (current === null || prev == null) return "—";
      return scoreDeltaLabel(current - prev);
    }
    return "";
  };

  const row = (
    label: string,
    current: number | null,
    prev: number | null | undefined,
  ) => {
    const score = formatScore(current).padStart(5);
    if (!thirdCol) return `| ${label} | ${score} |`;
    return `| ${label} | ${score} | ${third(current, prev)} |`;
  };

  return [
    header,
    divider,
    row("Performance   ", scores.performance, previous?.performance),
    row("Accessibility ", scores.accessibility, previous?.accessibility),
    row("Best Practices", scores.bestPractices, previous?.bestPractices),
    row("SEO           ", scores.seo, previous?.seo),
  ].join("\n");
};

export const formatMetrics = (
  metrics: MetricSet,
  options: { mode?: "table" | "list"; previous?: MetricSet } = {},
): string => {
  const { mode = "table", previous } = options;

  if (mode === "list") {
    return [
      `- **LCP** ${formatMs(metrics.lcp)}${metrics.lcp !== null ? (metrics.lcp <= 2500 ? " ✅" : " ❌") : ""}`,
      `- **FCP** ${formatMs(metrics.fcp)}`,
      `- **TBT** ${formatMs(metrics.tbt)}${metrics.tbt !== null ? (metrics.tbt <= 200 ? " ✅" : " ❌") : ""}`,
      `- **CLS** ${formatCls(metrics.cls)}${metrics.cls !== null ? (metrics.cls <= 0.1 ? " ✅" : " ❌") : ""}`,
      `- **Speed Index** ${formatMs(metrics.speedIndex)}`,
    ].join("\n");
  }

  const showTrend = previous !== undefined;

  const header = showTrend
    ? "| Metric      | Value    | Trend   |"
    : "| Metric      | Value    |";
  const divider = showTrend
    ? "|-------------|----------|---------|"
    : "|-------------|----------|";

  const trend = (
    current: number | null,
    prev: number | null | undefined,
    isCls = false,
  ) => {
    if (!showTrend) return "";
    if (isCls)
      return clsDeltaLabel(
        current !== null && prev != null ? current - prev : null,
      );
    return msDeltaLabel(
      current !== null && prev != null ? current - prev : null,
    );
  };

  const row = (label: string, value: string, trendStr: string) => {
    if (!showTrend) return `| ${label} | ${value.padStart(8)} |`;
    return `| ${label} | ${value.padStart(8)} | ${trendStr.padStart(7)} |`;
  };

  return [
    header,
    divider,
    row(
      "LCP        ",
      formatMs(metrics.lcp),
      trend(metrics.lcp, previous?.lcp),
    ),
    row(
      "FCP        ",
      formatMs(metrics.fcp),
      trend(metrics.fcp, previous?.fcp),
    ),
    row(
      "TBT        ",
      formatMs(metrics.tbt),
      trend(metrics.tbt, previous?.tbt),
    ),
    row(
      "CLS        ",
      formatCls(metrics.cls),
      trend(metrics.cls, previous?.cls, true),
    ),
    row(
      "Speed Index",
      formatMs(metrics.speedIndex),
      trend(metrics.speedIndex, previous?.speedIndex),
    ),
  ].join("\n");
};
