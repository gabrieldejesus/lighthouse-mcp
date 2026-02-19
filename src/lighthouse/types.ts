export type AuditCategory =
  | "performance"
  | "accessibility"
  | "best-practices"
  | "seo";

export interface RunAuditOptions {
  url: string;
  device?: "mobile" | "desktop";
  categories?: AuditCategory[];
}

export interface RunAuditResult {
  rawLhr: unknown;
  scores: {
    seo: number | null;
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
  };
  metrics: {
    lcp: number | null;
    fcp: number | null;
    tbt: number | null;
    cls: number | null;
    speedIndex: number | null;
  };
}
