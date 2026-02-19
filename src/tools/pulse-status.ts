import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// storage, types, git & utils
import { AuditResult } from "../storage/types.js";
import { getGitContext } from "../git/repository.js";
import { getLatestAudit, getAuditHistory } from "../storage/database.js";
import { formatMs, formatScore, formatCls, formatTimestamp } from "./format.js";

const scoreEmoji = (score: number | null): string => {
  if (score === null) return "⚪";
  if (score >= 90) return "🟢";
  if (score >= 50) return "🟡";

  return "🔴";
};

const timeAgo = (ts: number): string => {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (mins > 0) return `${mins} minute${mins === 1 ? "" : "s"} ago`;

  return "just now";
};

const trendLabel = (
  audits: AuditResult[],
): { label: string; emoji: string } => {
  if (audits.length < 2) return { label: "not enough data", emoji: "⚪" };

  const newest = audits[0].performanceScore;
  const prev = audits[1].performanceScore;

  if (newest === null || prev === null)
    return { label: "unknown", emoji: "⚪" };

  const delta = newest - prev;

  if (Math.abs(delta) < 3) return { label: "stable", emoji: "➡️" };
  if (delta > 0) return { label: `improving (+${delta})`, emoji: "⬆️" };

  return { label: `declining (${delta})`, emoji: "⬇️" };
};

const buildRecommendations = (latest: AuditResult): string[] => {
  const recs: string[] = [];

  if (latest.performanceScore !== null && latest.performanceScore < 50) {
    recs.push(
      "Performance is critical — run `pulse_audit` and investigate LCP and TBT",
    );
  } else if (latest.performanceScore !== null && latest.performanceScore < 90) {
    recs.push("Performance has room to improve — check LCP and Speed Index");
  }

  if (latest.accessibilityScore !== null && latest.accessibilityScore < 90) {
    recs.push(
      "Accessibility needs attention — review contrast, labels, and ARIA attributes",
    );
  }

  if (latest.lcp !== null && latest.lcp > 2500) {
    recs.push(
      `LCP is ${Math.round(latest.lcp)}ms (target: <2,500ms) — optimize images and server response time`,
    );
  }

  if (latest.tbt !== null && latest.tbt > 200) {
    recs.push(
      `TBT is ${Math.round(latest.tbt)}ms (target: <200ms) — reduce JavaScript execution time`,
    );
  }

  if (latest.cls !== null && latest.cls > 0.1) {
    recs.push(
      `CLS is ${latest.cls.toFixed(3)} (target: <0.1) — add size attributes to images and embeds`,
    );
  }

  if (
    recs.length === 0 &&
    latest.performanceScore !== null &&
    latest.performanceScore >= 90
  ) {
    recs.push("All scores look great — keep monitoring for regressions");
  }

  return recs;
};

const formatStatusOutput = (
  url: string,
  latest: AuditResult,
  audits: AuditResult[],
  currentBranch: string | null,
): string => {
  const { label: trendText, emoji: trendIcon } = trendLabel(audits);
  const branch = latest.gitBranch ?? currentBranch ?? "—";
  const commit = latest.gitCommit ? latest.gitCommit.slice(0, 7) : "—";
  const recs = buildRecommendations(latest);

  const lines: string[] = [
    `## Pulse Status — ${url}`,
    `Branch: **${branch}** · Last audit: **${timeAgo(latest.timestamp)}** · Trend: ${trendIcon} ${trendText}`,
    "",
    "### Latest Scores",
    "| Category       | Score | Grade |",
    "|----------------|-------|-------|",
    `| Performance    | ${formatScore(latest.performanceScore).padStart(5)} | ${scoreEmoji(latest.performanceScore)}    |`,
    `| Accessibility  | ${formatScore(latest.accessibilityScore).padStart(5)} | ${scoreEmoji(latest.accessibilityScore)}    |`,
    `| Best Practices | ${formatScore(latest.bestPracticesScore).padStart(5)} | ${scoreEmoji(latest.bestPracticesScore)}    |`,
    `| SEO            | ${formatScore(latest.seoScore).padStart(5)} | ${scoreEmoji(latest.seoScore)}    |`,
    "",
    "### Core Web Vitals",
    `- **LCP** ${formatMs(latest.lcp)}${latest.lcp !== null ? (latest.lcp <= 2500 ? " ✅" : " ❌") : ""}`,
    `- **FCP** ${formatMs(latest.fcp)}`,
    `- **TBT** ${formatMs(latest.tbt)}${latest.tbt !== null ? (latest.tbt <= 200 ? " ✅" : " ❌") : ""}`,
    `- **CLS** ${formatCls(latest.cls)}${latest.cls !== null ? (latest.cls <= 0.1 ? " ✅" : " ❌") : ""}`,
    `- **Speed Index** ${formatMs(latest.speedIndex)}`,
    "",
    `_Audit from commit \`${commit}\` on ${formatTimestamp(latest.timestamp)}_`,
  ];

  if (recs.length > 0) {
    lines.push("", "### Recommendations", ...recs.map((r) => `- ${r}`));
  }

  return lines.join("\n");
};

export const registerPulseStatus = (server: McpServer): void => {
  server.registerTool(
    "pulse_status",
    {
      title: "Pulse Status",
      description:
        "Get a quick performance status overview for a URL. Shows the latest audit scores, Core Web Vitals, trend direction, and actionable recommendations based on stored results.",
      inputSchema: {
        url: z.string().url().describe("The URL to check status for"),
        branch: z
          .string()
          .optional()
          .describe(
            "Filter to a specific branch (default: latest audit on any branch)",
          ),
      },
    },
    async ({ url, branch }) => {
      try {
        const [gitCtx, latest] = await Promise.all([
          getGitContext(),
          Promise.resolve(getLatestAudit(url, branch)),
        ]);

        if (!latest) {
          const branchNote = branch ? ` on branch **${branch}**` : "";
          return {
            content: [
              {
                type: "text",
                text: [
                  `## Pulse Status — ${url}`,
                  "",
                  `No audits found for this URL${branchNote}.`,
                  "",
                  "Run `pulse_audit` to start tracking performance.",
                ].join("\n"),
              },
            ],
          };
        }

        const audits = getAuditHistory(url, 5, branch);
        const output = formatStatusOutput(
          url,
          latest,
          audits,
          gitCtx?.branch ?? null,
        );

        return { content: [{ type: "text", text: output }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text",
              text: `## Pulse Status Failed\n\n**Error:** ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
};
