import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// storage, git & types
import { AuditComparison } from "../storage/types.js";
import { getGitContext, getBaseBranch } from "../git/repository.js";
import { getLatestAudit, compareAudits } from "../storage/database.js";

const formatMs = (ms: number | null): string => {
  if (ms === null) return "—";
  return `${Math.round(ms).toLocaleString()}ms`;
};

const formatScore = (score: number | null): string => {
  if (score === null) return "—";
  return String(score);
};

const formatCls = (cls: number | null): string => {
  if (cls === null) return "—";
  return cls.toFixed(3);
};

const scoreDeltaLabel = (delta: number | null): string => {
  if (delta === null || delta === 0) return "—";
  if (delta > 0) return `+${delta} ⬆️`;
  return `${delta} ⬇️`;
};

const msDeltaLabel = (delta: number | null, lowerIsBetter = true): string => {
  if (delta === null || delta === 0) return "—";
  const abs = `${Math.abs(Math.round(delta))}ms`;
  if (lowerIsBetter) {
    return delta < 0 ? `-${abs} ⬆️` : `+${abs} ⬇️`;
  }
  return delta > 0 ? `+${abs} ⬆️` : `-${abs} ⬇️`;
};

const clsDeltaLabel = (delta: number | null): string => {
  if (delta === null || delta === 0) return "—";
  const abs = Math.abs(delta).toFixed(3);
  return delta < 0 ? `-${abs} ⬆️` : `+${abs} ⬇️`;
};

const pad = (s: string, len: number): string => s.padStart(len);

const formatTimestamp = (ts: number): string =>
  new Date(ts).toISOString().replace("T", " ").slice(0, 16);

const formatCompareOutput = (
  url: string,
  baselineBranch: string,
  currentBranch: string,
  comparison: AuditComparison,
): string => {
  const { baseline, current, deltas } = comparison;

  const lines: string[] = [
    `## Pulse Compare — ${url}`,
    `Comparing: **${currentBranch}** vs **${baselineBranch}**`,
    "",
    "### Scores",
    `| Category       | ${pad(baselineBranch, 16)} | ${pad(currentBranch, 16)} | Delta          |`,
    `|----------------|${"-".repeat(18)}|${"-".repeat(18)}|----------------|`,
    `| Performance    | ${pad(formatScore(baseline.performanceScore), 16)} | ${pad(formatScore(current.performanceScore), 16)} | ${pad(scoreDeltaLabel(deltas.performanceScore), 14)} |`,
    `| Accessibility  | ${pad(formatScore(baseline.accessibilityScore), 16)} | ${pad(formatScore(current.accessibilityScore), 16)} | ${pad(scoreDeltaLabel(deltas.accessibilityScore), 14)} |`,
    `| Best Practices | ${pad(formatScore(baseline.bestPracticesScore), 16)} | ${pad(formatScore(current.bestPracticesScore), 16)} | ${pad(scoreDeltaLabel(deltas.bestPracticesScore), 14)} |`,
    `| SEO            | ${pad(formatScore(baseline.seoScore), 16)} | ${pad(formatScore(current.seoScore), 16)} | ${pad(scoreDeltaLabel(deltas.seoScore), 14)} |`,
    "",
    "### Core Web Vitals",
    `| Metric      | ${pad(baselineBranch, 10)} | ${pad(currentBranch, 10)} | Delta       |`,
    `|-------------|${"-".repeat(12)}|${"-".repeat(12)}|-------------|`,
    `| LCP         | ${pad(formatMs(baseline.lcp), 10)} | ${pad(formatMs(current.lcp), 10)} | ${pad(msDeltaLabel(deltas.lcp), 11)} |`,
    `| FCP         | ${pad(formatMs(baseline.fcp), 10)} | ${pad(formatMs(current.fcp), 10)} | ${pad(msDeltaLabel(deltas.fcp), 11)} |`,
    `| TBT         | ${pad(formatMs(baseline.tbt), 10)} | ${pad(formatMs(current.tbt), 10)} | ${pad(msDeltaLabel(deltas.tbt), 11)} |`,
    `| CLS         | ${pad(formatCls(baseline.cls), 10)} | ${pad(formatCls(current.cls), 10)} | ${pad(clsDeltaLabel(deltas.cls), 11)} |`,
    `| Speed Index | ${pad(formatMs(baseline.speedIndex), 10)} | ${pad(formatMs(current.speedIndex), 10)} | ${pad(msDeltaLabel(deltas.speedIndex), 11)} |`,
    "",
    "### Audit Sources",
    `Baseline audit: ${formatTimestamp(baseline.timestamp)}${baseline.gitCommit ? ` (commit: ${baseline.gitCommit.slice(0, 7)})` : ""}`,
    `Current audit:  ${formatTimestamp(current.timestamp)}${current.gitCommit ? ` (commit: ${current.gitCommit.slice(0, 7)})` : ""}`,
  ];

  const regressions = buildRegressionSummary(deltas);

  if (regressions.length > 0) {
    lines.push("", "### ⚠️ Regressions", ...regressions.map((r) => `- ${r}`));
  }

  const improvements = buildImprovementSummary(deltas);
  if (improvements.length > 0) {
    lines.push("", "### ✅ Improvements", ...improvements.map((i) => `- ${i}`));
  }

  return lines.join("\n");
};

const buildRegressionSummary = (
  deltas: AuditComparison["deltas"],
): string[] => {
  const items: string[] = [];

  if (deltas.performanceScore !== null && deltas.performanceScore < -5)
    items.push(
      `Performance score dropped by ${Math.abs(deltas.performanceScore)} points`,
    );
  if (deltas.accessibilityScore !== null && deltas.accessibilityScore < -5)
    items.push(
      `Accessibility score dropped by ${Math.abs(deltas.accessibilityScore)} points`,
    );
  if (deltas.bestPracticesScore !== null && deltas.bestPracticesScore < -5)
    items.push(
      `Best Practices score dropped by ${Math.abs(deltas.bestPracticesScore)} points`,
    );
  if (deltas.seoScore !== null && deltas.seoScore < -5)
    items.push(`SEO score dropped by ${Math.abs(deltas.seoScore)} points`);
  if (deltas.lcp !== null && deltas.lcp > 200)
    items.push(
      `LCP increased by ${Math.round(deltas.lcp)}ms (page loads slower)`,
    );
  if (deltas.tbt !== null && deltas.tbt > 50)
    items.push(
      `TBT increased by ${Math.round(deltas.tbt)}ms (main thread more blocked)`,
    );
  if (deltas.cls !== null && deltas.cls > 0.01)
    items.push(`CLS increased by ${deltas.cls.toFixed(3)} (more layout shift)`);

  return items;
};

const buildImprovementSummary = (
  deltas: AuditComparison["deltas"],
): string[] => {
  const items: string[] = [];

  if (deltas.performanceScore !== null && deltas.performanceScore > 5)
    items.push(
      `Performance score improved by ${deltas.performanceScore} points`,
    );
  if (deltas.accessibilityScore !== null && deltas.accessibilityScore > 5)
    items.push(
      `Accessibility score improved by ${deltas.accessibilityScore} points`,
    );
  if (deltas.bestPracticesScore !== null && deltas.bestPracticesScore > 5)
    items.push(
      `Best Practices score improved by ${deltas.bestPracticesScore} points`,
    );
  if (deltas.seoScore !== null && deltas.seoScore > 5)
    items.push(`SEO score improved by ${deltas.seoScore} points`);
  if (deltas.lcp !== null && deltas.lcp < -200)
    items.push(`LCP improved by ${Math.abs(Math.round(deltas.lcp))}ms`);
  if (deltas.tbt !== null && deltas.tbt < -50)
    items.push(`TBT improved by ${Math.abs(Math.round(deltas.tbt))}ms`);
  if (deltas.cls !== null && deltas.cls < -0.01)
    items.push(`CLS improved by ${Math.abs(deltas.cls).toFixed(3)}`);

  return items;
};

const noAuditMessage = (
  url: string,
  branch: string,
  role: "baseline" | "current",
): string =>
  `## Pulse Compare — No ${role} audit found\n\nNo audit exists for **${url}** on branch **${branch}**.\n\nRun \`pulse_audit\` on that branch first, then compare.`;

export const registerPulseCompare = (server: McpServer): void => {
  server.registerTool(
    "pulse_compare",
    {
      title: "Pulse Compare",
      description:
        "Compare Lighthouse audit results between two branches for a given URL. Shows side-by-side scores and Core Web Vitals with delta indicators, highlighting regressions and improvements. Run pulse_audit on both branches first.",
      inputSchema: {
        url: z.string().url().describe("The URL to compare audits for"),
        baselineBranch: z
          .string()
          .optional()
          .describe(
            "Branch to compare against (default: auto-detected main/master)",
          ),
        currentBranch: z
          .string()
          .optional()
          .describe("Current branch to compare (default: detected from git)"),
      },
    },
    async ({ url, baselineBranch, currentBranch }) => {
      try {
        const gitCtx = await getGitContext();

        const resolvedCurrentBranch =
          currentBranch ?? gitCtx?.branch ?? "unknown";

        const resolvedBaselineBranch =
          baselineBranch ?? (await getBaseBranch());

        const [baselineAudit, currentAudit] = await Promise.all([
          Promise.resolve(getLatestAudit(url, resolvedBaselineBranch)),
          Promise.resolve(getLatestAudit(url, resolvedCurrentBranch)),
        ]);

        if (!baselineAudit) {
          return {
            content: [
              {
                type: "text",
                text: noAuditMessage(url, resolvedBaselineBranch, "baseline"),
              },
            ],
          };
        }

        if (!currentAudit) {
          return {
            content: [
              {
                type: "text",
                text: noAuditMessage(url, resolvedCurrentBranch, "current"),
              },
            ],
          };
        }

        const comparison = compareAudits(baselineAudit.id, currentAudit.id);

        const output = formatCompareOutput(
          url,
          resolvedBaselineBranch,
          resolvedCurrentBranch,
          comparison,
        );

        return { content: [{ type: "text", text: output }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text",
              text: `## Pulse Compare Failed\n\n**Error:** ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
};
