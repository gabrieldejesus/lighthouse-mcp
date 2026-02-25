import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// storage, types & utils
import {
  saveAudit,
  saveFullResult,
  getLatestAudit,
  updateFullResultPath,
} from "../storage/database.js";
import { AuditResult } from "../storage/types.js";
import { runAudit } from "../lighthouse/runner.js";
import { getGitContext } from "../git/repository.js";
import { RunAuditResult } from "../lighthouse/types.js";
import { formatScoreTable, formatMetrics } from "../utils/format-scores.js";
import { ScoreSet, MetricSet, formatTimestamp } from "../utils/primitives.js";

const formatAuditOutput = (
  url: string,
  saved: AuditResult,
  auditResult: RunAuditResult,
  previous: AuditResult | null,
): string => {
  const date = formatTimestamp(saved.timestamp);
  const branch = saved.gitBranch ?? "—";
  const commit = saved.gitCommit ? saved.gitCommit.slice(0, 7) : "—";

  const scores: ScoreSet = {
    performance: auditResult.scores.performance,
    accessibility: auditResult.scores.accessibility,
    bestPractices: auditResult.scores.bestPractices,
    seo: auditResult.scores.seo,
  };

  const prevScores: ScoreSet | undefined = previous
    ? {
        performance: previous.performanceScore,
        accessibility: previous.accessibilityScore,
        bestPractices: previous.bestPracticesScore,
        seo: previous.seoScore,
      }
    : undefined;

  const metrics: MetricSet = {
    lcp: auditResult.metrics.lcp,
    fcp: auditResult.metrics.fcp,
    tbt: auditResult.metrics.tbt,
    cls: auditResult.metrics.cls,
    speedIndex: auditResult.metrics.speedIndex,
  };

  const prevMetrics: MetricSet | undefined = previous
    ? {
        lcp: previous.lcp,
        fcp: previous.fcp,
        tbt: previous.tbt,
        cls: previous.cls,
        speedIndex: previous.speedIndex,
      }
    : undefined;

  const lines: string[] = [
    `## Lighthouse Audit — ${url}`,
    `Branch: ${branch}  |  Commit: ${commit}  |  ${date}`,
    "",
    "### Scores",
    formatScoreTable(scores, { mode: "trend", previous: prevScores }),
    "",
    "### Core Web Vitals",
    formatMetrics(metrics, { previous: prevMetrics }),
  ];

  if (saved.fullResultPath) {
    lines.push("", `Full report saved to: ${saved.fullResultPath}`);
  }

  return lines.join("\n");
};

export const registerLighthouseAudit = (server: McpServer): void => {
  server.registerTool(
    "lighthouse_audit",
    {
      title: "Lighthouse Audit",
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
              text: `## Lighthouse Audit Failed\n\n**Error:** ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
};
