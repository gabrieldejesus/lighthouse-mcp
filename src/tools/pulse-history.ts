import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// storage, types & utils
import { AuditResult } from "../storage/types.js";
import { getAuditHistory } from "../storage/database.js";
import { formatMs, formatScore, formatCls, formatTimestamp } from "./format.js";

const trendArrow = (
  current: number | null,
  previous: number | null,
  lowerIsBetter = false,
): string => {
  if (current === null || previous === null) return "";
  const delta = current - previous;
  if (Math.abs(delta) < 0.5) return "";
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return improved ? " ⬆️" : " ⬇️";
};

const overallTrend = (audits: AuditResult[]): string => {
  if (audits.length < 2) return "";
  const newest = audits[0];
  const oldest = audits[audits.length - 1];

  if (newest.performanceScore === null || oldest.performanceScore === null)
    return "";
  const delta = newest.performanceScore - oldest.performanceScore;

  if (Math.abs(delta) < 2) return "Performance is **stable**";
  if (delta > 0)
    return `Performance is **improving** (+${delta} points over ${audits.length} audits)`;
  return `Performance is **declining** (${delta} points over ${audits.length} audits)`;
};

const formatHistoryOutput = (
  url: string,
  audits: AuditResult[],
  branch?: string,
): string => {
  if (audits.length === 0) {
    const branchNote = branch ? ` on branch **${branch}**` : "";

    return [
      `## Pulse History — ${url}`,
      "",
      `No audits found for this URL${branchNote}.`,
      "",
      "Run `pulse_audit` to start tracking performance.",
    ].join("\n");
  }

  const branchNote = branch ? ` (branch: ${branch})` : "";
  const trend = overallTrend(audits);

  const lines: string[] = [
    `## Pulse History — ${url}${branchNote}`,
    `Showing ${audits.length} audit${audits.length === 1 ? "" : "s"}${trend ? " · " + trend : ""}`,
    "",
    "### Timeline",
    "| # | Date             | Branch          | Commit  | Perf | A11y | BP  | SEO | LCP      | TBT      | CLS   |",
    "|---|------------------|-----------------|---------|------|------|-----|-----|----------|----------|-------|",
  ];

  audits.forEach((audit, i) => {
    const prev = audits[i + 1] ?? null;
    const perfArrow = trendArrow(
      audit.performanceScore,
      prev?.performanceScore ?? null,
    );
    const lcpArrow = trendArrow(audit.lcp, prev?.lcp ?? null, true);
    const tbtArrow = trendArrow(audit.tbt, prev?.tbt ?? null, true);

    const branch = (audit.gitBranch ?? "—").slice(0, 15);
    const commit = audit.gitCommit ? audit.gitCommit.slice(0, 7) : "—";

    lines.push(
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
        `| ${formatCls(audit.cls).padEnd(5)} |`,
    );
  });

  const notableChanges = buildNotableChanges(audits);
  if (notableChanges.length > 0) {
    lines.push(
      "",
      "### Notable Changes",
      ...notableChanges.map((c) => `- ${c}`),
    );
  }

  return lines.join("\n");
};

const buildNotableChanges = (audits: AuditResult[]): string[] => {
  if (audits.length < 2) return [];

  const changes: string[] = [];
  const newest = audits[0];
  const oldest = audits[audits.length - 1];

  const scoreDelta = (
    label: string,
    current: number | null,
    base: number | null,
  ) => {
    if (current === null || base === null) return;
    const delta = current - base;
    if (delta >= 10) changes.push(`${label} improved by ${delta} points`);
    else if (delta <= -10)
      changes.push(`${label} dropped by ${Math.abs(delta)} points`);
  };

  const msDelta = (
    label: string,
    current: number | null,
    base: number | null,
    threshold = 500,
  ) => {
    if (current === null || base === null) return;
    const delta = current - base;
    if (delta <= -threshold)
      changes.push(`${label} improved by ${Math.abs(Math.round(delta))}ms`);
    else if (delta >= threshold)
      changes.push(`${label} regressed by ${Math.round(delta)}ms`);
  };

  scoreDelta("Performance", newest.performanceScore, oldest.performanceScore);
  scoreDelta(
    "Accessibility",
    newest.accessibilityScore,
    oldest.accessibilityScore,
  );
  scoreDelta(
    "Best Practices",
    newest.bestPracticesScore,
    oldest.bestPracticesScore,
  );
  scoreDelta("SEO", newest.seoScore, oldest.seoScore);
  msDelta("LCP", newest.lcp, oldest.lcp);
  msDelta("TBT", newest.tbt, oldest.tbt, 200);
  msDelta("Speed Index", newest.speedIndex, oldest.speedIndex);

  return changes;
};

export const registerPulseHistory = (server: McpServer): void => {
  server.registerTool(
    "pulse_history",
    {
      title: "Pulse History",
      description:
        "Show the audit history for a URL from the local database. Returns a timeline table with scores, Core Web Vitals, trend indicators, and notable changes over time.",
      inputSchema: {
        url: z.string().url().describe("The URL to show history for"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Number of audits to show (default: 10)"),
        branch: z
          .string()
          .optional()
          .describe("Filter history to a specific branch"),
      },
    },
    async ({ url, limit = 10, branch }) => {
      try {
        const audits = getAuditHistory(url, limit, branch);
        const output = formatHistoryOutput(url, audits, branch);
        return { content: [{ type: "text", text: output }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text",
              text: `## Pulse History Failed\n\n**Error:** ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
};
