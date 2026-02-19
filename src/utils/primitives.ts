export interface ScoreSet {
  seo: number | null;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
}

export interface MetricSet {
  lcp: number | null;
  fcp: number | null;
  tbt: number | null;
  cls: number | null;
  speedIndex: number | null;
}

export const formatMs = (ms: number | null): string => {
  if (ms === null) return "—";
  return `${Math.round(ms).toLocaleString()}ms`;
};

export const formatScore = (score: number | null): string => {
  if (score === null) return "—";
  return String(score);
};

export const formatCls = (cls: number | null): string => {
  if (cls === null) return "—";
  return cls.toFixed(3);
};

export const formatTimestamp = (ts: number): string =>
  new Date(ts).toISOString().replace("T", " ").slice(0, 16);

export const scoreEmoji = (score: number | null): string => {
  if (score === null) return "⚪";
  if (score >= 90) return "🟢";
  if (score >= 50) return "🟡";

  return "🔴";
};

export const scoreBadge = (score: number | null): string => {
  if (score === null) return "⚪";
  if (score >= 90) return "✅";
  if (score >= 50) return "⚠️";

  return "❌";
};

export const scoreDeltaLabel = (delta: number | null): string => {
  if (delta === null || delta === 0) return "—";
  if (delta > 0) return `+${delta} ⬆️`;

  return `${delta} ⬇️`;
};

export const msDeltaLabel = (
  delta: number | null,
  lowerIsBetter = true,
): string => {
  if (delta === null || delta === 0) return "—";
  const abs = `${Math.abs(Math.round(delta))}ms`;

  if (lowerIsBetter) {
    return delta < 0 ? `-${abs} ⬆️` : `+${abs} ⬇️`;
  }

  return delta > 0 ? `+${abs} ⬆️` : `-${abs} ⬇️`;
};

export const clsDeltaLabel = (delta: number | null): string => {
  if (delta === null || delta === 0) return "—";
  const abs = Math.abs(delta).toFixed(3);
  return delta < 0 ? `-${abs} ⬆️` : `+${abs} ⬇️`;
};
