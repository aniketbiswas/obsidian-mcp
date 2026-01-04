/**
 * ============================================================================
 * CALCULATOR TOOLS - Example MCP Tools
 * ============================================================================
 * 
 * This file shows how to create MCP tools step by step.
 * Use this as a template when creating your own tools!
 * 
 * WHAT IS A TOOL?
 * A tool is a function that AI can call. When a user asks Claude to
 * "add 5 and 3", Claude will call your 'add' tool with {a: 5, b: 3}.
 * 
 * ANATOMY OF A TOOL:
 * 
 *   server.tool(
 *     "tool_name",           // Unique name (lowercase, underscores ok)
 *     "Description",         // What the tool does (AI reads this!)
 *     { params },            // Input parameters with Zod validation
 *     async (inputs) => {}   // Your function that does the work
 *   );
 * 
 * COPY THIS FILE to create your own tools!
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";  // Zod validates that inputs are the correct type

/**
 * Registers all calculator tools with the MCP server.
 * 
 * @param server - The MCP server instance to register tools with
 */
export function registerCalculatorTools(server: McpServer): void {
  
  // ---------------------------------------------------------------------------
  // TOOL: add
  // ---------------------------------------------------------------------------
  // This is the simplest possible tool - takes two numbers, returns their sum.
  // ---------------------------------------------------------------------------
  
  server.tool(
    // 1. TOOL NAME - must be unique across all your tools
    "add",
    
    // 2. DESCRIPTION - AI uses this to decide when to call your tool
    //    Write it clearly! The better the description, the better AI uses it.
    "Add two numbers together",
    
    // 3. INPUT SCHEMA - defines what parameters the tool accepts
    //    Uses Zod for validation: z.number(), z.string(), z.boolean(), etc.
    //    .describe() helps AI understand what each parameter is for
    {
      a: z.number().describe("First number to add"),
      b: z.number().describe("Second number to add"),
    },
    
    // 4. HANDLER FUNCTION - this runs when AI calls your tool
    //    Receives validated inputs, must return a content array
    async ({ a, b }) => {
      // Your tool logic goes here!
      const result = a + b;
      
      // Return format: array of content blocks
      // Most common: { type: "text", text: "your result" }
      return {
        content: [
          {
            type: "text",
            text: `${a} + ${b} = ${result}`,
          },
        ],
      };
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: subtract
  // ---------------------------------------------------------------------------
  
  server.tool(
    "subtract",
    "Subtract the second number from the first",
    {
      a: z.number().describe("Number to subtract from"),
      b: z.number().describe("Number to subtract"),
    },
    async ({ a, b }) => {
      const result = a - b;
      return {
        content: [{ type: "text", text: `${a} - ${b} = ${result}` }],
      };
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: multiply
  // ---------------------------------------------------------------------------
  
  server.tool(
    "multiply",
    "Multiply two numbers together",
    {
      a: z.number().describe("First number to multiply"),
      b: z.number().describe("Second number to multiply"),
    },
    async ({ a, b }) => {
      const result = a * b;
      return {
        content: [{ type: "text", text: `${a} × ${b} = ${result}` }],
      };
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: divide (with error handling example)
  // ---------------------------------------------------------------------------
  // This tool shows how to handle errors gracefully.
  // Set isError: true to tell AI the operation failed.
  // ---------------------------------------------------------------------------
  
  server.tool(
    "divide",
    "Divide the first number by the second",
    {
      a: z.number().describe("Dividend (number to be divided)"),
      b: z.number().describe("Divisor (number to divide by)"),
    },
    async ({ a, b }) => {
      // Always validate inputs and handle edge cases!
      if (b === 0) {
        return {
          content: [
            { type: "text", text: "Error: Cannot divide by zero" },
          ],
          isError: true,  // Tells AI this is an error response
        };
      }
      
      const result = a / b;
      return {
        content: [{ type: "text", text: `${a} ÷ ${b} = ${result}` }],
      };
    }
  );
}

// =============================================================================
// QUICK REFERENCE: Zod Types You Can Use
// =============================================================================
//
// z.string()           - Text input
// z.number()           - Numeric input
// z.boolean()          - True/false
// z.enum(["a", "b"])   - One of specific values
// z.array(z.string())  - Array of strings
// z.object({...})      - Nested object
// z.optional()         - Makes parameter optional
// z.default("value")   - Provides default value
//
// Chain them: z.string().optional().describe("Optional text")
// =============================================================================
