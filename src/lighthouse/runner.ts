import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

// types
import { RunAuditOptions, RunAuditResult, AuditCategory } from "./types.js";

const ALL_CATEGORIES: AuditCategory[] = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
];

const METRIC_AUDIT_IDS = {
  speedIndex: "speed-index",
  tbt: "total-blocking-time",
  cls: "cumulative-layout-shift",
  fcp: "first-contentful-paint",
  lcp: "largest-contentful-paint",
} as const;

const getNumericValue = (
  audits: Record<string, { numericValue?: number }>,
  id: string,
): number | null => audits[id]?.numericValue ?? null;

const getCategoryScore = (
  categories: Record<string, { score: number | null }>,
  id: string,
): number | null => {
  const score = categories[id]?.score;
  if (score === null || score === undefined) return null;
  return Math.round(score * 100);
};

export const runAudit = async (
  options: RunAuditOptions,
): Promise<RunAuditResult> => {
  const { url, device = "mobile", categories = ALL_CATEGORIES } = options;

  let chrome;

  try {
    chrome = await launch({ chromeFlags: ["--headless", "--no-sandbox"] });
  } catch (err) {
    throw new Error(
      `Chrome could not be launched. Make sure Chrome or Chromium is installed.\n${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    const isDesktop = device === "desktop";

    const flags = {
      port: chrome.port,
      onlyCategories: categories,
      ...(isDesktop && {
        formFactor: "desktop" as const,
        screenEmulation: { disabled: true },
      }),
    };

    const result = await lighthouse(url, flags);

    if (!result) {
      throw new Error(`Lighthouse returned no result for URL: ${url}`);
    }

    const { lhr } = result;

    if (lhr.runtimeError) {
      throw new Error(
        `Lighthouse runtime error (${lhr.runtimeError.code}): ${lhr.runtimeError.message}`,
      );
    }

    const { audits, categories: lhrCategories } = lhr;

    return {
      scores: {
        seo: getCategoryScore(lhrCategories, "seo"),
        performance: getCategoryScore(lhrCategories, "performance"),
        accessibility: getCategoryScore(lhrCategories, "accessibility"),
        bestPractices: getCategoryScore(lhrCategories, "best-practices"),
      },
      metrics: {
        lcp: getNumericValue(audits, METRIC_AUDIT_IDS.lcp),
        fcp: getNumericValue(audits, METRIC_AUDIT_IDS.fcp),
        tbt: getNumericValue(audits, METRIC_AUDIT_IDS.tbt),
        cls: getNumericValue(audits, METRIC_AUDIT_IDS.cls),
        speedIndex: getNumericValue(audits, METRIC_AUDIT_IDS.speedIndex),
      },
      rawLhr: lhr,
    };
  } finally {
    await chrome.kill();
  }
};
