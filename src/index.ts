import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer(
  {
    name: "pulse-mcp",
    version: "1.0.0",
  },
  {
    instructions:
      "Pulse MCP tracks web performance using Lighthouse. Use pulse_audit to run an audit, pulse_compare to compare branches, pulse_history to see past results, and pulse_status for a quick overview.",
  },
);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pulse MCP server running on stdio");
};

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
