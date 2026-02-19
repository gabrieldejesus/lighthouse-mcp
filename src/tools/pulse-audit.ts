import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// storage, git, lighthouse
import {
  saveAudit,
  saveFullResult,
  getLatestAudit,
  updateFullResultPath,
} from "../storage/database.js";
import { AuditResult } from "../storage/types.js";
import { getGitContext } from "../git/repository.js";
import { runAudit } from "../lighthouse/runner.js";
import { RunAuditResult } from "../lighthouse/types.js";

const formatMs = (ms: number | null): string => {
  if (ms === null) return "—";
  return `${Math.round(ms).toLocaleString()}ms`;
};

const formatScore = (score: number | null): string => {
  if (score === null) return "—";
  return String(score);
};

const formatDelta = (delta: number | null, lowerIsBetter = false): string => {
  if (delta === null || delta === 0) return "—";
  const sign = delta > 0 ? "+" : "";

  if (lowerIsBetter) {
    return delta > 0 ? `+${Math.round(delta)}` : `${Math.round(delta)}`;
  }

  return `${sign}${Math.round(delta)}`;
};

const formatMsDelta = (delta: number | null): string => {
  if (delta === null || delta === 0) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${Math.round(delta)}ms`;
};

const formatAuditOutput = (
  url: string,
  saved: AuditResult,
  auditResult: RunAuditResult,
  previous: AuditResult | null,
): string => {
  const date = new Date(saved.timestamp)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16);
  const branch = saved.gitBranch ?? "—";
  const commit = saved.gitCommit ? saved.gitCommit.slice(0, 7) : "—";

  const prevScores = previous
    ? {
        seo: previous.seoScore,
        performance: previous.performanceScore,
        accessibility: previous.accessibilityScore,
        bestPractices: previous.bestPracticesScore,
      }
    : null;

  const prevMetrics = previous
    ? {
        lcp: previous.lcp,
        fcp: previous.fcp,
        tbt: previous.tbt,
        cls: previous.cls,
        speedIndex: previous.speedIndex,
      }
    : null;

  const scoreDelta = (current: number | null, prev: number | null) => {
    if (!prevScores || current === null || prev === null) return "—";
    return formatDelta(current - prev);
  };

  const metricDelta = (
    current: number | null,
    prev: number | null,
    lowerIsBetter = true,
  ) => {
    if (!prevMetrics || current === null || prev === null) return "—";
    const delta = current - prev;
    return lowerIsBetter ? formatMsDelta(delta) : formatDelta(delta);
  };

  const { scores, metrics } = auditResult;

  const lines: string[] = [
    `## Pulse Audit — ${url}`,
    `Branch: ${branch}  |  Commit: ${commit}  |  ${date}`,
    "",
    "### Scores",
    "| Category       | Score | Trend |",
    "|----------------|-------|-------|",
    `| Performance    | ${formatScore(scores.performance).padStart(5)} | ${scoreDelta(scores.performance, prevScores?.performance ?? null).padStart(5)} |`,
    `| Accessibility  | ${formatScore(scores.accessibility).padStart(5)} | ${scoreDelta(scores.accessibility, prevScores?.accessibility ?? null).padStart(5)} |`,
    `| Best Practices | ${formatScore(scores.bestPractices).padStart(5)} | ${scoreDelta(scores.bestPractices, prevScores?.bestPractices ?? null).padStart(5)} |`,
    `| SEO            | ${formatScore(scores.seo).padStart(5)} | ${scoreDelta(scores.seo, prevScores?.seo ?? null).padStart(5)} |`,
    "",
    "### Core Web Vitals",
    "| Metric      | Value    | Trend   |",
    "|-------------|----------|---------|",
    `| LCP         | ${formatMs(metrics.lcp).padStart(8)} | ${metricDelta(metrics.lcp, prevMetrics?.lcp ?? null).padStart(7)} |`,
    `| FCP         | ${formatMs(metrics.fcp).padStart(8)} | ${metricDelta(metrics.fcp, prevMetrics?.fcp ?? null).padStart(7)} |`,
    `| TBT         | ${formatMs(metrics.tbt).padStart(8)} | ${metricDelta(metrics.tbt, prevMetrics?.tbt ?? null).padStart(7)} |`,
    `| CLS         | ${(metrics.cls !== null ? metrics.cls.toFixed(3) : "—").padStart(8)} | ${metricDelta(metrics.cls, prevMetrics?.cls ?? null, false).padStart(7)} |`,
    `| Speed Index | ${formatMs(metrics.speedIndex).padStart(8)} | ${metricDelta(metrics.speedIndex, prevMetrics?.speedIndex ?? null).padStart(7)} |`,
  ];

  if (saved.fullResultPath) {
    lines.push("");
    lines.push(`Full report saved to: ${saved.fullResultPath}`);
  }

  return lines.join("\n");
};

export const registerPulseAudit = (server: McpServer): void => {
  server.registerTool(
    "pulse_audit",
    {
      title: "Pulse Audit",
      description:
        "Run a Lighthouse performance audit on a URL. Saves results locally with git context and returns a markdown summary with scores, Core Web Vitals, and trend indicators compared to the previous audit on the same branch.",
      inputSchema: {
        url: z.string().url().describe("The URL to audit"),
        device: z
          .enum(["mobile", "desktop"])
          .optional()
          .describe("Device emulation mode (default: mobile)"),
        categories: z
          .array(
            z.enum(["performance", "accessibility", "best-practices", "seo"]),
          )
          .optional()
          .describe("Lighthouse categories to run (default: all)"),
      },
    },
    async ({ url, device, categories }) => {
      try {
        const [gitCtx, previous] = await Promise.all([
          getGitContext(),
          getLatestAudit(url),
        ]);

        const auditResult = await runAudit({ url, device, categories });

        const auditToSave: Omit<AuditResult, "id"> = {
          url,
          fullResultPath: null,
          timestamp: Date.now(),
          lcp: auditResult.metrics.lcp,
          fcp: auditResult.metrics.fcp,
          tbt: auditResult.metrics.tbt,
          cls: auditResult.metrics.cls,
          seoScore: auditResult.scores.seo,
          gitCommit: gitCtx?.commit ?? null,
          gitBranch: gitCtx?.branch ?? null,
          speedIndex: auditResult.metrics.speedIndex,
          performanceScore: auditResult.scores.performance,
          accessibilityScore: auditResult.scores.accessibility,
          bestPracticesScore: auditResult.scores.bestPractices,
        };

        const saved = saveAudit(auditToSave);
        const fullResultPath = saveFullResult(saved.id, auditResult.rawLhr);
        updateFullResultPath(saved.id, fullResultPath);

        const savedWithPath: AuditResult = { ...saved, fullResultPath };

        const output = formatAuditOutput(
          url,
          savedWithPath,
          auditResult,
          previous,
        );

        return { content: [{ type: "text", text: output }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text",
              text: `## Pulse Audit Failed\n\n**Error:** ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
};
