export type DeviceMode = "mobile" | "desktop";

export type AuditCategory =
  | "performance"
  | "accessibility"
  | "best-practices"
  | "seo";

export interface AuditResult {
  id: number;
  url: string;
  timestamp: number;
  lcp: number | null;
  fcp: number | null;
  tbt: number | null;
  cls: number | null;
  seoScore: number | null;
  gitCommit: string | null;
  gitBranch: string | null;
  speedIndex: number | null;
  fullResultPath: string | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
}

export interface AuditComparison {
  current: AuditResult;
  baseline: AuditResult;
  deltas: {
    lcp: number | null;
    fcp: number | null;
    tbt: number | null;
    cls: number | null;
    seoScore: number | null;
    speedIndex: number | null;
    performanceScore: number | null;
    accessibilityScore: number | null;
    bestPracticesScore: number | null;
  };
}
