#!/usr/bin/env node

/**
 * ============================================================================
 * MCP SERVER STARTER - Main Entry Point
 * ============================================================================
 * 
 * Welcome! This is the main file that initializes your MCP server.
 * 
 * WHAT IS MCP?
 * MCP (Model Context Protocol) lets AI assistants like Claude use your tools.
 * Think of it as building plugins that AI can use to perform actions.
 * 
 * HOW THIS FILE WORKS:
 * 1. Creates an MCP server instance
 * 2. Registers all your tools, resources, and prompts
 * 3. Starts listening for requests from AI clients
 * 
 * TO ADD YOUR OWN TOOLS:
 * 1. Create a new file in src/tools/ (copy calculator.ts as a template)
 * 2. Import your register function below
 * 3. Call it with the server instance
 * 4. Run: npm run build && npm run inspector
 * 
 * For more information: https://modelcontextprotocol.io
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------

// The MCP SDK - this handles all the protocol communication for you
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Your tool modules - add new imports here when you create new tools
import { registerCalculatorTools } from "./tools/calculator.js";
import { registerGreetingTools } from "./tools/greeting.js";

// Resources and prompts (optional features)
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

// -----------------------------------------------------------------------------
// SERVER SETUP
// -----------------------------------------------------------------------------

/**
 * Create the MCP server instance.
 * 
 * The 'name' appears in MCP clients to identify your server.
 * The 'version' helps with debugging and updates.
 */
const server = new McpServer({
  name: "mcp-server-starter",
  version: "1.0.0",
});

// -----------------------------------------------------------------------------
// REGISTER YOUR TOOLS HERE
// -----------------------------------------------------------------------------
// Each register function adds tools to the server.
// Tools are functions that AI can call to perform actions.
//
// Example: To add a new tool file called "weather.ts":
//   1. Create src/tools/weather.ts
//   2. Add: import { registerWeatherTools } from "./tools/weather.js";
//   3. Add: registerWeatherTools(server);
// -----------------------------------------------------------------------------

registerCalculatorTools(server);  // Math operations: add, subtract, multiply, divide
registerGreetingTools(server);    // Utility tools: greet, get_current_time, echo

// -----------------------------------------------------------------------------
// REGISTER RESOURCES (Optional)
// -----------------------------------------------------------------------------
// Resources provide data that AI can read (like files or API responses).
// See src/resources/index.ts for examples.
// -----------------------------------------------------------------------------

registerResources(server);

// -----------------------------------------------------------------------------
// REGISTER PROMPTS (Optional)
// -----------------------------------------------------------------------------
// Prompts are pre-written templates for common tasks.
// See src/prompts/index.ts for examples.
// -----------------------------------------------------------------------------

registerPrompts(server);

// -----------------------------------------------------------------------------
// START THE SERVER
// -----------------------------------------------------------------------------

/**
 * Main function - starts the MCP server.
 * 
 * IMPORTANT: Use console.error() for logging, NOT console.log()!
 * The stdout (console.log) is reserved for MCP protocol messages.
 */
async function main() {
  // StdioServerTransport communicates via stdin/stdout
  // This is how MCP clients (VS Code, Claude Desktop) talk to your server
  const transport = new StdioServerTransport();
  
  // Connect and start listening for requests
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with the protocol
  console.error("✅ MCP Server Starter is running!");
  console.error("   Use 'npm run inspector' to test your tools.");
}

// Run the server and handle any fatal errors
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
