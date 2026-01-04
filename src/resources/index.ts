/**
 * ============================================================================
 * MCP RESOURCES - Providing Data to AI
 * ============================================================================
 * 
 * Resources are data sources that AI can read. Unlike tools (which DO things),
 * resources PROVIDE things - like files, database records, or API responses.
 * 
 * WHEN TO USE RESOURCES vs TOOLS:
 * - Resource: "Here's the content of config.json" (reading data)
 * - Tool: "Update the config file with these values" (performing action)
 * 
 * ANATOMY OF A RESOURCE:
 * 
 *   server.resource(
 *     "name",                    // Display name for the resource
 *     "mcp://your/uri",          // Unique URI to identify it
 *     { description, mimeType }, // Metadata
 *     async (uri) => {}          // Function that returns the content
 *   );
 * 
 * NOTE: Resources are optional! Many MCP servers only have tools.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Registers example resources.
 * Delete or modify these - they're just examples!
 */
export function registerResources(server: McpServer): void {

  // ---------------------------------------------------------------------------
  // RESOURCE: readme (simple text resource)
  // ---------------------------------------------------------------------------
  // This resource provides static text information about the server.
  // Great for documentation or static content.
  // ---------------------------------------------------------------------------
  
  server.resource(
    "readme",                          // Name shown in MCP clients
    "mcp://server/readme",             // URI - use mcp:// for custom resources
    {
      description: "Information about this MCP server",
      mimeType: "text/plain",          // Tells AI what kind of data this is
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,               // Echo back the requested URI
          mimeType: "text/plain",
          text: `MCP Server Starter

This is a starter template for building MCP servers.

Available Tools:
- add: Add two numbers
- subtract: Subtract two numbers
- multiply: Multiply two numbers
- divide: Divide two numbers
- greet: Generate a personalized greeting
- get_current_time: Get the current date and time
- echo: Echo back a message

For more information, visit: https://modelcontextprotocol.io`,
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // RESOURCE: server-info (JSON data resource)
  // ---------------------------------------------------------------------------
  // This resource provides structured JSON data.
  // Useful for configuration, status info, or structured data.
  // ---------------------------------------------------------------------------
  
  server.resource(
    "server-info",
    "mcp://server/info",
    {
      description: "JSON data about this MCP server",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          // You can generate dynamic data here!
          text: JSON.stringify(
            {
              name: "mcp-server-starter",
              version: "1.0.0",
              capabilities: {
                tools: true,
                resources: true,
                prompts: true,
              },
              toolCount: 7,
              timestamp: new Date().toISOString(),
            },
            null,
            2  // Pretty-print with 2-space indent
          ),
        },
      ],
    })
  );
}

// =============================================================================
// MORE RESOURCE IDEAS
// =============================================================================
//
// Dynamic file content:
//   import { readFile } from "fs/promises";
//   text: await readFile("./data/config.json", "utf-8")
//
// API response:
//   const response = await fetch("https://api.example.com/data");
//   text: await response.text()
//
// Database query:
//   const rows = await db.query("SELECT * FROM users");
//   text: JSON.stringify(rows)
//
// =============================================================================
