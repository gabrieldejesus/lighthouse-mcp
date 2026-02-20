# Pulse MCP

Performance tracking that your AI understands.

Runs Lighthouse audits, stores results locally with git context, and surfaces scores, Core Web Vitals, and trend comparisons directly in your AI chat.

---

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
    "pulse-mcp": {
      "command": "npx",
      "args": ["pulse-mcp"]
    }
  }
}
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pulse-mcp": {
      "command": "npx",
      "args": ["pulse-mcp"]
    }
  }
}
```

Restart the client after saving.

---

## Tools

| Tool            | What it does                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `pulse_audit`   | Run a Lighthouse audit on a URL. Saves scores, Core Web Vitals, and the full LHR with git context. |
| `pulse_compare` | Compare the latest audit on two branches side-by-side with delta indicators.                       |
| `pulse_history` | Show a timeline of past audits for a URL with trend arrows.                                        |
| `pulse_status`  | Quick overview — latest scores, pass/fail vitals, and recommendations.                             |

**Example prompts:**

```
Run a Lighthouse audit on https://my-site.com
Compare performance between main and my current branch for https://my-site.com
Show audit history for https://my-site.com
What's the status of https://my-site.com?
```

---

## Options

`pulse_audit` accepts:

| Parameter    | Type                                                        | Default    |
| ------------ | ----------------------------------------------------------- | ---------- |
| `url`        | string (required)                                           | —          |
| `device`     | `"mobile"` \| `"desktop"`                                   | `"mobile"` |
| `categories` | `["performance", "accessibility", "best-practices", "seo"]` | all        |

---

## Local storage

Results are saved automatically to `~/.pulse/`:

```
~/.pulse/
├── audits.db          # SQLite — all audit metadata
└── results/           # Full Lighthouse JSON reports
    └── 1-1708354200000.json
```

No account, no server, no config file needed.

---

## Self-host / develop

```bash
git clone https://github.com/gabrieldejesus/pulse-mcp
cd pulse-mcp
npm install
npm run build
npm test
```

Point your MCP client at the local build:

```json
{
  "command": "node",
  "args": ["/path/to/pulse-mcp/dist/index.js"]
}
```

---

## License

MIT
