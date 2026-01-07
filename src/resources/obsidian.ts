/**
 * ============================================================================
 * OBSIDIAN MCP - Resources
 * ============================================================================
 *
 * MCP Resources provide read-only data that AI can access.
 * These resources provide vault information and status data.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ObsidianClient } from "../utils/client.js";
import { isConfigured, CONFIG_DOCS } from "../utils/config.js";

/**
 * Register Obsidian resources with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client (or null if not configured)
 */
export function registerObsidianResources(
  server: McpServer,
  client: ObsidianClient | null
): void {
  // ---------------------------------------------------------------------------
  // RESOURCE: obsidian-status
  // ---------------------------------------------------------------------------
  // Provides connection status and configuration info.
  // ---------------------------------------------------------------------------

  server.resource(
    "obsidian-status",
    "mcp://obsidian/status",
    {
      description: "Obsidian connection status and configuration information",
      mimeType: "application/json",
    },
    async (uri) => {
      let status: Record<string, unknown>;

      if (!client) {
        status = {
          connected: false,
          configured: false,
          message: "Obsidian is not configured. Set OBSIDIAN_API_KEY environment variable.",
        };
      } else {
        try {
          const serverStatus = await client.getServerStatus();
          status = {
            connected: serverStatus.authenticated,
            configured: true,
            obsidianVersion: serverStatus.versions.obsidian,
            apiVersion: serverStatus.versions.self,
            service: serverStatus.service,
          };
        } catch (error) {
          status = {
            connected: false,
            configured: true,
            error: error instanceof Error ? error.message : String(error),
            message: "Failed to connect to Obsidian. Make sure it's running with Local REST API enabled.",
          };
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }
  );

  // ---------------------------------------------------------------------------
  // RESOURCE: obsidian-help
  // ---------------------------------------------------------------------------
  // Provides documentation and available tools list.
  // ---------------------------------------------------------------------------

  server.resource(
    "obsidian-help",
    "mcp://obsidian/help",
    {
      description: "Documentation and help for the Obsidian MCP server",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: `# Obsidian MCP Server

This MCP server provides tools for interacting with your Obsidian vault through any MCP-compatible AI assistant.

## Prerequisites

1. **Obsidian** must be running
2. **Local REST API plugin** must be installed and enabled
3. **API Key** must be configured via environment variable

## Configuration

\`\`\`
${CONFIG_DOCS}
\`\`\`

## Available Tool Categories

### Vault Management
- \`vault_status\` - Check connection status
- \`list_files\` - List files in a directory
- \`list_all_files\` - Recursively list all files
- \`get_vault_structure\` - Get folder tree structure
- \`get_file_stats\` - Get vault statistics

### Note Operations
- \`read_note\` - Read note content
- \`create_note\` - Create a new note
- \`update_note\` - Update note content
- \`append_to_note\` - Append to a note
- \`prepend_to_note\` - Prepend to a note
- \`insert_under_heading\` - Insert under specific heading
- \`replace_in_note\` - Find and replace text
- \`delete_note\` - Delete a note
- \`copy_note\` - Copy a note

### Search
- \`search_notes\` - Full-text search with Obsidian syntax
- \`simple_search\` - Simple text search
- \`search_by_tag\` - Find notes by tags
- \`search_in_folder\` - Search within a folder
- \`find_notes_by_name\` - Find by filename
- \`search_with_context\` - Search with content snippets

### Metadata & Tags
- \`get_frontmatter\` - Get note frontmatter
- \`update_frontmatter\` - Update frontmatter properties
- \`set_frontmatter_property\` - Set single property
- \`get_tags\` - Get all tags from a note
- \`add_tags\` - Add tags to a note
- \`remove_tags\` - Remove tags from a note
- \`add_aliases\` - Add note aliases
- \`get_all_tags_in_vault\` - Get all tags in vault

### Navigation & Commands
- \`open_note\` - Open note in Obsidian
- \`get_active_note\` - Get currently active note
- \`append_to_active_note\` - Append to active note
- \`get_commands\` - List Obsidian commands
- \`execute_command\` - Execute a command
- \`quick_capture\` - Quick capture to inbox

### Daily & Periodic Notes
- \`get_daily_note\` - Get today's daily note
- \`append_to_daily_note\` - Append to daily note
- \`get_periodic_note\` - Get periodic note
- \`append_to_periodic_note\` - Append to periodic note
- \`daily_journal_entry\` - Add journal entry
- \`daily_standup\` - Add standup entry

### Link Analysis
- \`get_outgoing_links\` - Get links from a note
- \`get_backlinks\` - Find backlinks to a note
- \`find_broken_links\` - Find broken links
- \`find_orphan_notes\` - Find unlinked notes
- \`add_link_to_note\` - Add a link to a note
- \`get_link_graph_data\` - Get graph visualization data

### Templates
- \`create_note_from_template\` - Create from template
- \`create_meeting_note\` - Create meeting note
- \`create_project_note\` - Create project note
- \`list_templates\` - List available templates

## Examples

### Create a new note
"Create a note called 'Meeting Notes' in the Meetings folder with today's date"

### Search vault
"Search for notes about machine learning"
"Find all notes tagged with #project"

### Daily notes
"Add this task to today's daily note"
"Create a journal entry with today's highlights"

### Analyze links
"Find all notes that link to my 'Project Overview' note"
"Show me orphan notes that need to be linked"

## Tips

- Use wikilinks format: \`[[Note Name]]\` for internal links
- Tags can be in frontmatter or inline: \`#tag\`
- Obsidian search syntax works in \`search_notes\`
- Daily notes require the Daily Notes core plugin
`,
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // RESOURCE: obsidian-vault-info
  // ---------------------------------------------------------------------------
  // Provides vault structure information.
  // ---------------------------------------------------------------------------

  if (client) {
    server.resource(
      "obsidian-vault-info",
      "mcp://obsidian/vault-info",
      {
        description: "Information about the Obsidian vault structure",
        mimeType: "application/json",
      },
      async (uri) => {
        try {
          const allFiles = await client.listAllFiles("", 5);
          const mdFiles = allFiles.filter(
            (f) => f.type === "file" && f.extension === "md"
          );
          const directories = allFiles.filter((f) => f.type === "directory");

          // Count by extension
          const extensionCounts: Record<string, number> = {};
          for (const file of allFiles.filter((f) => f.type === "file")) {
            const ext = file.extension || "no-extension";
            extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
          }

          const info = {
            totalFiles: allFiles.filter((f) => f.type === "file").length,
            markdownNotes: mdFiles.length,
            directories: directories.length,
            extensionCounts,
            topLevelFolders: directories
              .filter((d) => !d.path.includes("/"))
              .map((d) => d.name)
              .slice(0, 20),
          };

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(info, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(
                  {
                    error: error instanceof Error ? error.message : String(error),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }
    );
  }

  console.error("✅ Obsidian resources registered");
}
