# 🗃️ Obsidian MCP Server

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-1.0.0-blue)](https://modelcontextprotocol.io)

Connect AI assistants like **Claude** to your [Obsidian](https://obsidian.md) vault via [Model Context Protocol](https://modelcontextprotocol.io). **40+ tools** for searching, creating, and managing your notes—all 100% local.

---

## What Can You Do?

| You Say | What Happens |
|---------|--------------|
| "Search my notes for machine learning" | Searches your entire vault |
| "Create a meeting note for tomorrow" | Creates a formatted meeting note |
| "What links to my Projects note?" | Shows all backlinks |
| "Add to my daily note: finished the API" | Appends to today's daily note |
| "Find orphan notes" | Lists unconnected notes |

---

## Quick Start

### 1. Install the Obsidian Plugin

1. **Obsidian** → **Settings** → **Community plugins** → **Browse**
2. Search "**Local REST API**" → **Install** → **Enable**
3. **Settings** → **Local REST API** → Copy your **API Key**

### 2. Install the MCP Server

```bash
git clone https://github.com/YOUR_USERNAME/obsidian-mcp.git
cd obsidian-mcp
npm install && npm run build
```

### 3. Configure Claude Desktop

Edit the config file:

| OS | Config Path |
|----|-------------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/claude/claude_desktop_config.json` |

Add this configuration:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/FULL/PATH/TO/obsidian-mcp/build/index.js"],
      "env": {
        "OBSIDIAN_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

> **Windows paths:** Use `C:\\Users\\Name\\...` or `C:/Users/Name/...`

### 4. Restart Claude Desktop

Make sure Obsidian is running, then try: *"Show me my vault status"*

---

## Available Tools

<details>
<summary><strong>📁 Vault (6)</strong> — Status, list files, structure</summary>

`vault_status` · `list_files` · `list_all_files` · `get_vault_structure` · `get_file_stats` · `delete_file`
</details>

<details>
<summary><strong>📝 Notes (9)</strong> — CRUD operations</summary>

`read_note` · `create_note` · `update_note` · `append_to_note` · `prepend_to_note` · `insert_under_heading` · `replace_in_note` · `delete_note` · `copy_note`
</details>

<details>
<summary><strong>🔍 Search (7)</strong> — Full-text, tags, folders</summary>

`search_notes` · `simple_search` · `search_by_tag` · `search_in_folder` · `find_notes_by_name` · `get_recent_notes` · `search_with_context`
</details>

<details>
<summary><strong>📊 Metadata (8)</strong> — Frontmatter & tags</summary>

`get_frontmatter` · `update_frontmatter` · `set_frontmatter_property` · `get_tags` · `add_tags` · `remove_tags` · `add_aliases` · `get_all_tags_in_vault`
</details>

<details>
<summary><strong>🧭 Navigation (6)</strong> — Open notes, run commands</summary>

`open_note` · `get_active_note` · `append_to_active_note` · `get_commands` · `execute_command` · `quick_capture`
</details>

<details>
<summary><strong>📅 Daily Notes (6)</strong> — Journals & standups</summary>

`get_daily_note` · `append_to_daily_note` · `get_periodic_note` · `append_to_periodic_note` · `daily_journal_entry` · `daily_standup`
</details>

<details>
<summary><strong>🔗 Links (6)</strong> — Backlinks, orphans, graph</summary>

`get_outgoing_links` · `get_backlinks` · `find_broken_links` · `find_orphan_notes` · `add_link_to_note` · `get_link_graph_data`
</details>

<details>
<summary><strong>📋 Templates (4)</strong> — Meeting, project, etc.</summary>

`create_note_from_template` · `create_meeting_note` · `create_project_note` · `list_templates`

Built-in: `meeting` · `project` · `book` · `article` · `person` · `recipe` · `decision`
</details>

---

## Configuration

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `OBSIDIAN_API_KEY` | ✅ | — | From Local REST API plugin |
| `OBSIDIAN_HOST` | | `127.0.0.1` | API host |
| `OBSIDIAN_PORT` | | `27124` | API port |
| `OBSIDIAN_SECURE` | | `true` | Use HTTPS |
| `OBSIDIAN_VERIFY_SSL` | | `false` | Verify SSL certificate |

---

## Troubleshooting

<details>
<summary><strong>Claude doesn't see the server</strong></summary>

- Validate JSON: `cat config.json | python3 -m json.tool`
- Path must be **absolute** (starts with `/` or `C:\`)
- Restart Claude Desktop completely (Cmd+Q / right-click quit)
- Windows: ensure file is `.json` not `.json.txt`
</details>

<details>
<summary><strong>Connection errors</strong></summary>

- Obsidian must be running with Local REST API enabled
- Test API: `curl -k https://127.0.0.1:27124/ -H "Authorization: Bearer YOUR_KEY"`
- Regenerate API key if needed
</details>

<details>
<summary><strong>Windows: "node not recognized"</strong></summary>

Use full path: `"command": "C:\\Program Files\\nodejs\\node.exe"`
</details>

---

## Development

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm run inspector  # Test tools in browser UI
```

### Adding Tools

Create/edit files in `src/tools/`, then rebuild:

```typescript
server.tool("my_tool", "Description", { param: z.string() }, async ({ param }) => {
  return { content: [{ type: "text", text: "Result" }] };
});
```

---

## FAQ

**Is it free?** Yes, the Local REST API plugin is free.

**Are my notes sent to the cloud?** No. Everything stays local. Only your conversation with Claude goes to Anthropic (like any Claude chat).

**Works with Obsidian Sync?** Yes, it accesses your local vault files.

---

## Contributing

PRs welcome! Fork → create branch → commit → open PR.

---

## License

MIT — see [LICENSE](LICENSE)

---

Built with [MCP SDK](https://modelcontextprotocol.io) · Powered by [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
