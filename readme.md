# Lighthouse MCP

Performance tracking that your AI understands.

Runs Lighthouse audits, stores results locally with git context, and surfaces scores, Core Web Vitals, and trend comparisons directly in your AI chat.

---

## Installation

```bash
npm install -g @igabrieldejesus/lighthouse-mcp
```

Or use directly with `npx` (no installation needed):

```bash
npx @igabrieldejesus/lighthouse-mcp
```

## Requirements

- Node 18+
- Chrome or Chromium installed

---

## Add to your AI client

### Cursor

Open **Settings → MCP → Add new server**:

```json
{
  "mcpServers": {
    "lighthouse-mcp": {
      "command": "npx",
      "args": ["@igabrieldejesus/lighthouse-mcp"]
    }
  }
}
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lighthouse-mcp": {
      "command": "npx",
      "args": ["@igabrieldejesus/lighthouse-mcp"]
    }
  }
}
```

Restart the client after saving.

---

## Tools

| Tool                 | What it does                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `lighthouse_audit`   | Run a Lighthouse audit on a URL. Saves scores, Core Web Vitals, and the full LHR with git context. |
| `lighthouse_compare` | Compare the latest audit on two branches side-by-side with delta indicators.                       |
| `lighthouse_history` | Show a timeline of past audits for a URL with trend arrows.                                        |
| `lighthouse_status`  | Quick overview — latest scores, pass/fail vitals, and recommendations.                             |

**Example prompts:**

```
Run a Lighthouse audit on https://my-site.com
Compare performance between main and my current branch for https://my-site.com
Show audit history for https://my-site.com
What's the status of https://my-site.com?
```

---

## Options

`lighthouse_audit` accepts:

| Parameter    | Type                                                        | Default    |
| ------------ | ----------------------------------------------------------- | ---------- |
| `url`        | string (required)                                           | —          |
| `device`     | `"mobile"` \| `"desktop"`                                   | `"mobile"` |
| `categories` | `["performance", "accessibility", "best-practices", "seo"]` | all        |

---

## Local storage

Results are saved automatically to `~/.lighthouse-mcp/`:

```
~/.lighthouse-mcp/
├── audits.db          # SQLite — all audit metadata
└── results/           # Full Lighthouse JSON reports
    └── 1-1708354200000.json
```

No account, no server, no config file needed.

---

## Self-host / develop

```bash
git clone https://github.com/gabrieldejesus/lighthouse-mcp
cd lighthouse-mcp-src
npm install
npm run build
npm test
```

Point your MCP client at the local build:

```json
{
  "command": "node",
  "args": ["/path/to/lighthouse-mcp-src/dist/index.js"]
}
```

---

## License

MIT
