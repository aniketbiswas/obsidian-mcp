/**
 * ============================================================================
 * OBSIDIAN MCP - Tools Index
 * ============================================================================
 *
 * Central registration point for all Obsidian MCP tools.
 * Each tool module is imported and registered with the server.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ObsidianClient } from "../utils/client.js";

// Import tool registration functions
import { registerVaultTools } from "./vault.js";
import { registerNoteTools } from "./notes.js";
import { registerSearchTools } from "./search.js";
import { registerMetadataTools } from "./metadata.js";
import { registerNavigationTools } from "./navigation.js";
import { registerDailyNotesTools } from "./daily-notes.js";
import { registerLinkTools } from "./links.js";
import { registerTemplateTools } from "./templates.js";

/**
 * Register all Obsidian tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client
 */
export function registerAllTools(server: McpServer, client: ObsidianClient): void {
  // Vault management tools
  registerVaultTools(server, client);

  // Note CRUD operations
  registerNoteTools(server, client);

  // Search functionality
  registerSearchTools(server, client);

  // Metadata and frontmatter management
  registerMetadataTools(server, client);

  // Navigation and commands
  registerNavigationTools(server, client);

  // Daily and periodic notes
  registerDailyNotesTools(server, client);

  // Link analysis tools
  registerLinkTools(server, client);

  // Template tools
  registerTemplateTools(server, client);

  console.error("✅ All Obsidian tools registered");
}

// Re-export individual tool registration functions for selective use
export {
  registerVaultTools,
  registerNoteTools,
  registerSearchTools,
  registerMetadataTools,
  registerNavigationTools,
  registerDailyNotesTools,
  registerLinkTools,
  registerTemplateTools,
};
