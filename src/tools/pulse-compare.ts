import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// git, storage, types & utils
import { formatComparison } from "../utils/format-compare.js";
import { getGitContext, getBaseBranch } from "../git/repository.js";
import { getLatestAudit, compareAudits } from "../storage/database.js";

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

        const body = formatComparison(
          comparison,
          resolvedBaselineBranch,
          resolvedCurrentBranch,
        );

        const output = [
          `## Pulse Compare — ${url}`,
          `Comparing: **${resolvedCurrentBranch}** vs **${resolvedBaselineBranch}**`,
          "",
          "### Scores",
          body,
        ].join("\n");

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
