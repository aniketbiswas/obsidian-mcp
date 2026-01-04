/**
 * ============================================================================
 * GREETING & UTILITY TOOLS - More Examples
 * ============================================================================
 * 
 * This file demonstrates:
 * - String parameters
 * - Enum parameters (dropdown/select style)
 * - Optional parameters with defaults
 * - Error handling with try/catch
 * 
 * GOOD TO KNOW:
 * - Tool names should be lowercase with underscores: "get_current_time"
 * - Descriptions should be clear and action-oriented
 * - Optional params use .optional() and .default()
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Registers greeting and utility tools.
 */
export function registerGreetingTools(server: McpServer): void {

  // ---------------------------------------------------------------------------
  // TOOL: greet (demonstrates enum and optional parameters)
  // ---------------------------------------------------------------------------
  // Shows how to:
  // - Use z.enum() for a fixed set of choices
  // - Make parameters optional with .optional()
  // - Provide default values with .default()
  // ---------------------------------------------------------------------------
  
  server.tool(
    "greet",
    "Generate a personalized greeting message",
    {
      // Required parameter - user must provide this
      name: z.string().describe("Name of the person to greet"),
      
      // Optional enum parameter with a default value
      // z.enum() restricts input to specific values
      language: z
        .enum(["english", "spanish", "french", "german", "japanese"])
        .optional()                    // Not required
        .default("english")            // Falls back to "english"
        .describe("Language for the greeting"),
    },
    async ({ name, language }) => {
      // Map language to greeting template
      const greetings: Record<string, string> = {
        english: `Hello, ${name}! Welcome!`,
        spanish: `¡Hola, ${name}! ¡Bienvenido!`,
        french: `Bonjour, ${name}! Bienvenue!`,
        german: `Hallo, ${name}! Willkommen!`,
        japanese: `こんにちは、${name}さん！ようこそ！`,
      };

      return {
        content: [
          { type: "text", text: greetings[language || "english"] },
        ],
      };
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_current_time (demonstrates try/catch error handling)
  // ---------------------------------------------------------------------------
  // Shows how to:
  // - Handle external errors gracefully
  // - Use try/catch in async handlers
  // - Return helpful error messages
  // ---------------------------------------------------------------------------
  
  server.tool(
    "get_current_time",
    "Get the current date and time",
    {
      timezone: z
        .string()
        .optional()
        .describe("Timezone (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')"),
    },
    async ({ timezone }) => {
      // Try to format the date with the specified timezone
      try {
        const options: Intl.DateTimeFormatOptions = {
          dateStyle: "full",
          timeStyle: "long",
          timeZone: timezone || "UTC",
        };
        
        const now = new Date();
        const formatted = new Intl.DateTimeFormat("en-US", options).format(now);
        
        return {
          content: [
            { type: "text", text: `Current time: ${formatted}` },
          ],
        };
      } catch (error) {
        // Intl.DateTimeFormat throws if timezone is invalid
        return {
          content: [
            { type: "text", text: `Error: Invalid timezone "${timezone}". Use IANA format like 'America/New_York'.` },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: echo (simplest possible tool - great for testing)
  // ---------------------------------------------------------------------------
  // Use this to verify your server is working correctly.
  // It just returns whatever you send it.
  // ---------------------------------------------------------------------------
  
  server.tool(
    "echo",
    "Echo back the provided message (useful for testing)",
    {
      message: z.string().describe("Message to echo back"),
    },
    async ({ message }) => {
      return {
        content: [
          { type: "text", text: `Echo: ${message}` },
        ],
      };
    }
  );
}
