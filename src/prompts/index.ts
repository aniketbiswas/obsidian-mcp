/**
 * ============================================================================
 * MCP PROMPTS - Pre-built Templates for AI Interactions
 * ============================================================================
 * 
 * Prompts are pre-written templates that help structure interactions.
 * They're like "shortcuts" - instead of typing a long prompt, users can
 * select a prompt and fill in a few parameters.
 * 
 * WHEN TO USE PROMPTS:
 * - Common tasks users do repeatedly
 * - Complex prompts that are hard to type from scratch
 * - Standardized workflows (code review, documentation, etc.)
 * 
 * ANATOMY OF A PROMPT:
 * 
 *   server.prompt(
 *     "prompt-name",             // Unique identifier
 *     "Description",             // What this prompt does
 *     { parameters },            // User inputs (using Zod)
 *     async (inputs) => {}       // Returns the formatted message(s)
 *   );
 * 
 * NOTE: Prompts are optional! Many MCP servers only have tools.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Registers example prompts.
 * Delete or modify these - they're just examples!
 */
export function registerPrompts(server: McpServer): void {

  // ---------------------------------------------------------------------------
  // PROMPT: code-review
  // ---------------------------------------------------------------------------
  // Takes code and returns a structured code review request.
  // Demonstrates basic prompt with string and optional parameters.
  // ---------------------------------------------------------------------------
  
  server.prompt(
    "code-review",
    "Generate a code review for the provided code",
    {
      code: z.string().describe("The code to review"),
      language: z.string().optional().describe("Programming language (e.g., 'typescript', 'python')"),
    },
    async ({ code, language }) => ({
      // Return an array of messages that form the prompt
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please review the following ${language || "code"} and provide feedback on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Suggestions for improvement

Code to review:
\`\`\`${language || ""}
${code}
\`\`\``,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: explain-code
  // ---------------------------------------------------------------------------
  // Simple prompt with just one required parameter.
  // ---------------------------------------------------------------------------
  
  server.prompt(
    "explain-code",
    "Explain what the provided code does",
    {
      code: z.string().describe("The code to explain"),
    },
    async ({ code }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please explain what the following code does in simple terms. Break it down step by step:

\`\`\`
${code}
\`\`\``,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: generate-docs
  // ---------------------------------------------------------------------------
  // Demonstrates using z.enum() for a fixed set of choices.
  // ---------------------------------------------------------------------------
  
  server.prompt(
    "generate-docs",
    "Generate documentation for the provided code",
    {
      code: z.string().describe("The code to document"),
      style: z
        .enum(["jsdoc", "markdown", "readme"])
        .optional()
        .default("jsdoc")
        .describe("Documentation style"),
    },
    async ({ code, style }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please generate ${style || "jsdoc"} documentation for the following code:

\`\`\`
${code}
\`\`\`

Make sure to include:
- Description of what the code does
- Parameter descriptions (if applicable)
- Return value description (if applicable)
- Usage examples`,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: debug-help
  // ---------------------------------------------------------------------------
  // Multiple required parameters for a debugging assistant.
  // ---------------------------------------------------------------------------
  
  server.prompt(
    "debug-help",
    "Help debug an issue with the provided code and error",
    {
      code: z.string().describe("The code with the bug"),
      error: z.string().describe("The error message or unexpected behavior"),
    },
    async ({ code, error }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I'm encountering an issue with my code. Please help me debug it.

**Error/Issue:**
${error}

**Code:**
\`\`\`
${code}
\`\`\`

Please:
1. Identify the likely cause of the issue
2. Explain why it's happening
3. Provide a fix or solution
4. Suggest how to prevent similar issues in the future`,
          },
        },
      ],
    })
  );
}
