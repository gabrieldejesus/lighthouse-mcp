import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// tools
import { registerLighthouseAudit } from "./tools/lighthouse-audit.js";
import { registerLighthouseStatus } from "./tools/lighthouse-status.js";
import { registerLighthouseCompare } from "./tools/lighthouse-compare.js";
import { registerLighthouseHistory } from "./tools/lighthouse-history.js";

const server = new McpServer(
  {
    name: "lighthouse-mcp",
    version: "1.0.0",
  },
  {
    instructions:
      "Lighthouse MCP tracks web performance using Lighthouse. Use lighthouse_audit to run an audit, lighthouse_compare to compare branches, lighthouse_history to see past results, and lighthouse_status for a quick overview.",
  },
);

registerLighthouseAudit(server);
registerLighthouseStatus(server);
registerLighthouseCompare(server);
registerLighthouseHistory(server);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lighthouse MCP server running on stdio");
};

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
