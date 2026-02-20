// types
import { AuditResult } from "../../src/storage/types.js";

export const mockAuditBase: Omit<AuditResult, "id"> = {
  lcp: 2450,
  fcp: 890,
  tbt: 310,
  cls: 0.08,
  seoScore: 92,
  speedIndex: 3100,
  gitBranch: "main",
  fullResultPath: null,
  performanceScore: 78,
  accessibilityScore: 95,
  bestPracticesScore: 83,
  url: "https://example.com",
  timestamp: 1_700_000_000_000,
  gitCommit: "abc1234567890abcdef",
};

export const mockAuditImproved: Omit<AuditResult, "id"> = {
  ...mockAuditBase,
  tbt: 150,
  cls: 0.03,
  lcp: 1800,
  speedIndex: 2400,
  performanceScore: 88,
  gitBranch: "feature/perf",
  timestamp: 1_700_100_000_000,
  gitCommit: "def5678901234abcde",
};

export const mockAuditRegressed: Omit<AuditResult, "id"> = {
  ...mockAuditBase,
  lcp: 4200,
  tbt: 650,
  cls: 0.25,
  performanceScore: 60,
  accessibilityScore: 80,
  timestamp: 1_700_200_000_000,
  gitCommit: "ghi9012345678abcde",
  gitBranch: "feature/regression",
};
