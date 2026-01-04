/**
 * ============================================================================
 * TOOL TEMPLATE - Copy This File to Create Your Own Tools!
 * ============================================================================
 * 
 * QUICK START:
 * 1. Copy this file: cp src/tools/_template.ts src/tools/my-tools.ts
 * 2. Rename the function: registerTemplateTools → registerMyTools
 * 3. Add your tools inside the function
 * 4. Register in src/index.ts:
 *    - import { registerMyTools } from "./tools/my-tools.js";
 *    - registerMyTools(server);
 * 5. Build and test: npm run build && npm run inspector
 * 
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register your custom tools here.
 * Rename this function to match your file name!
 */
export function registerTemplateTools(server: McpServer): void {

  // ---------------------------------------------------------------------------
  // EXAMPLE: Simple tool with one parameter
  // ---------------------------------------------------------------------------
  
  server.tool(
    "example_tool",                                    // Tool name
    "An example tool - replace with your own!",       // Description
    {
      input: z.string().describe("Your input parameter"),
    },
    async ({ input }) => {
      // Your logic here!
      const result = `You said: ${input}`;
      
      return {
        content: [{ type: "text", text: result }],
      };
    }
  );

  // ---------------------------------------------------------------------------
  // EXAMPLE: Tool with multiple parameters
  // ---------------------------------------------------------------------------
  
  server.tool(
    "example_multi_param",
    "Example with multiple parameters",
    {
      required_param: z.string().describe("This is required"),
      optional_param: z.string().optional().describe("This is optional"),
      number_param: z.number().describe("A number input"),
      choice_param: z.enum(["option1", "option2", "option3"]).describe("Pick one"),
    },
    async ({ required_param, optional_param, number_param, choice_param }) => {
      return {
        content: [{
          type: "text",
          text: `Required: ${required_param}, Optional: ${optional_param || "not provided"}, Number: ${number_param}, Choice: ${choice_param}`,
        }],
      };
    }
  );

  // ---------------------------------------------------------------------------
  // EXAMPLE: Tool with error handling
  // ---------------------------------------------------------------------------
  
  server.tool(
    "example_with_error",
    "Example showing error handling",
    {
      value: z.number().describe("A positive number"),
    },
    async ({ value }) => {
      // Validate and handle errors
      if (value < 0) {
        return {
          content: [{ type: "text", text: "Error: Value must be positive!" }],
          isError: true,  // Marks this as an error response
        };
      }
      
      return {
        content: [{ type: "text", text: `Success! Value is ${value}` }],
      };
    }
  );

  // ---------------------------------------------------------------------------
  // EXAMPLE: Async tool (API calls, file operations, etc.)
  // ---------------------------------------------------------------------------
  
  server.tool(
    "example_async",
    "Example with async operations",
    {
      url: z.string().url().describe("A URL to fetch"),
    },
    async ({ url }) => {
      try {
        // Example: fetch data from an API
        // const response = await fetch(url);
        // const data = await response.json();
        
        // Simulated async operation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          content: [{ type: "text", text: `Would fetch: ${url}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching URL: ${error}` }],
          isError: true,
        };
      }
    }
  );
}

// =============================================================================
// ZOD TYPE REFERENCE
// =============================================================================
//
// BASIC TYPES:
//   z.string()                    - Text
//   z.number()                    - Number (int or float)
//   z.boolean()                   - True/false
//   z.date()                      - Date object
//
// MODIFIERS:
//   .optional()                   - Not required
//   .default("value")             - Default value if not provided
//   .describe("text")             - Description for AI
//
// VALIDATIONS:
//   z.string().min(1)             - Minimum length
//   z.string().max(100)           - Maximum length
//   z.string().email()            - Must be email
//   z.string().url()              - Must be URL
//   z.number().min(0)             - Minimum value
//   z.number().max(100)           - Maximum value
//   z.number().int()              - Must be integer
//
// COMPLEX TYPES:
//   z.enum(["a", "b", "c"])       - One of specific values
//   z.array(z.string())           - Array of strings
//   z.object({ key: z.string() }) - Nested object
//
// =============================================================================
