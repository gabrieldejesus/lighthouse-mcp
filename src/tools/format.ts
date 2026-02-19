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
