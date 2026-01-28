#!/usr/bin/env node

/**
 * ============================================================================
 * OBSIDIAN MCP SERVER - Main Entry Point
 * ============================================================================
 * 
 * An MCP (Model Context Protocol) server for integrating AI assistants with
 * Obsidian via the Local REST API plugin.
 * 
 * PREREQUISITES:
 * 1. Install "Local REST API" plugin in Obsidian
 * 2. Enable the plugin and note your API key
 * 3. Set OBSIDIAN_API_KEY environment variable
 * 
 * FEATURES:
 * - 40+ tools for vault management, note CRUD, search, and more
 * - Daily notes and periodic notes support
 * - Frontmatter/metadata management
 * - Link analysis and graph operations
 * - Note templates and quick capture
 * 
 * For more information: https://modelcontextprotocol.io
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get package version for CLI
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Obsidian MCP Server - Connect AI assistants to your Obsidian vault

USAGE:
  obsidian-mcp-server [options]

OPTIONS:
  -h, --help      Show this help message
  -v, --version   Show version number

ENVIRONMENT VARIABLES:
  OBSIDIAN_API_KEY     (Required) Your Local REST API key
  OBSIDIAN_HOST        API host (default: 127.0.0.1)  
  OBSIDIAN_PORT        API port (default: 27124)
  OBSIDIAN_SECURE      Use HTTPS (default: true)
  OBSIDIAN_VERIFY_SSL  Verify SSL certificate (default: false)

SETUP:
  1. Install "Local REST API" plugin in Obsidian
  2. Copy your API key from plugin settings
  3. Set OBSIDIAN_API_KEY environment variable
  4. Add to your Claude Desktop config:

     {
       "mcpServers": {
         "obsidian": {
           "command": "obsidian-mcp-server",
           "env": { "OBSIDIAN_API_KEY": "your-key-here" }
         }
       }
     }

For more info: https://github.com/aniketbiswas/obsidian-mcp-server
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    console.log(`obsidian-mcp-server v${pkg.version}`);
  } catch {
    console.log("obsidian-mcp-server v1.0.0");
  }
  process.exit(0);
}

// Obsidian MCP components
import { registerAllTools } from "./tools/index.js";
import { registerObsidianResources } from "./resources/obsidian.js";
import { registerObsidianPrompts } from "./prompts/obsidian.js";

// Configuration and client
import { getConfig } from "./utils/config.js";
import { ObsidianClient } from "./utils/client.js";

/**
 * Create the MCP server instance.
 */
const server = new McpServer({
  name: "obsidian-mcp-server",
  version: "1.0.0",
});

/**
 * Main function - initializes and starts the MCP server.
 */
async function main() {
  // Validate configuration on startup
  let client: ObsidianClient | null = null;
  try {
    const config = getConfig();
    client = new ObsidianClient(config);
    console.error(`📂 Obsidian MCP Server starting...`);
    console.error(`   Host: ${config.host}:${config.port}`);
    console.error(`   Secure: ${config.secure}`);
  } catch (error) {
    console.error("⚠️  Configuration warning:", (error as Error).message);
    console.error("");
    console.error("Running in demo mode - tools will be visible but won't connect to Obsidian.");
    console.error("To enable full functionality, set:");
    console.error("  OBSIDIAN_API_KEY - Your Local REST API key (required)");
    console.error("");
    // Create a dummy client for demo mode
    const dummyConfig = {
      apiKey: "demo-mode",
      host: "127.0.0.1",
      port: 27124,
      secure: true,
      timeout: 30000,
      verifySsl: false,
    };
    client = new ObsidianClient(dummyConfig);
  }

  // Register all Obsidian tools
  registerAllTools(server, client);

  // Register resources
  registerObsidianResources(server, client);

  // Register prompts
  registerObsidianPrompts(server);

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("✅ Obsidian MCP Server is running!");
  console.error("   Tools: 40+ available");
  console.error("   Resources: 3 available");
  console.error("   Prompts: 8 available");
  console.error("");
  console.error("   Use 'npm run inspector' to test your tools.");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
