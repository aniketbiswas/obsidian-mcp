/**
 * ============================================================================
 * OBSIDIAN MCP - Navigation Tools
 * ============================================================================
 *
 * Tools for navigating the Obsidian UI: opening notes, getting active file,
 * and executing Obsidian commands.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObsidianClient } from "../utils/client.js";
import { ObsidianApiError } from "../types/obsidian.js";
import { getSummary, countWords } from "../utils/markdown.js";
import { getAllTags } from "../utils/frontmatter.js";

/**
 * Register navigation tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client
 */
export function registerNavigationTools(
  server: McpServer,
  client: ObsidianClient
): void {
  // ---------------------------------------------------------------------------
  // TOOL: open_note
  // ---------------------------------------------------------------------------
  // Open a note in the Obsidian UI.
  // ---------------------------------------------------------------------------

  server.tool(
    "open_note",
    "Open a note in the Obsidian user interface. " +
      "Makes the note visible and active in Obsidian.",
    {
      path: z.string().describe("Path to the note to open."),
      newPane: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to open in a new pane (split view)."),
    },
    async ({ path, newPane }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;
        await client.openFile(filePath, newPane);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Opened: ${filePath}`,
                  path: filePath,
                  newPane,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof ObsidianApiError ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `Error opening note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_active_note
  // ---------------------------------------------------------------------------
  // Get the currently active note in Obsidian.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_active_note",
    "Get the content of the currently active (focused) note in Obsidian. " +
      "Returns the note's content, path, and metadata.",
    {
      includeContent: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include the full content."),
      includeStats: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include word count and summary."),
    },
    async ({ includeContent, includeStats }) => {
      try {
        const note = await client.getActiveFile();

        if (!note) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    hasActiveNote: false,
                    message: "No note is currently open in Obsidian.",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const response: Record<string, unknown> = {
          success: true,
          hasActiveNote: true,
          path: note.path,
        };

        if (note.frontmatter && Object.keys(note.frontmatter).length > 0) {
          response.frontmatter = note.frontmatter;
        }

        if (includeContent) {
          response.content = note.content;
        }

        if (includeStats) {
          response.stats = {
            wordCount: countWords(note.content),
            summary: getSummary(note.content, 150),
            tags: getAllTags(note.content),
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof ObsidianApiError ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `Error getting active note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: append_to_active_note
  // ---------------------------------------------------------------------------
  // Append content to the currently active note.
  // ---------------------------------------------------------------------------

  server.tool(
    "append_to_active_note",
    "Append content to the currently active note in Obsidian. " +
      "Useful for quickly adding content to whatever note you're working on.",
    {
      content: z.string().describe("Content to append."),
      ensureNewline: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to ensure content starts on a new line."),
    },
    async ({ content, ensureNewline }) => {
      try {
        // First check if there's an active note
        const activeNote = await client.getActiveFile();

        if (!activeNote) {
          return {
            content: [
              {
                type: "text",
                text: "No note is currently open in Obsidian.",
              },
            ],
            isError: true,
          };
        }

        const contentToAppend = ensureNewline ? `\n${content}` : content;
        await client.appendToActiveFile(contentToAppend);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Content appended to: ${activeNote.path}`,
                  path: activeNote.path,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof ObsidianApiError ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `Error appending to active note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_commands
  // ---------------------------------------------------------------------------
  // Get list of available Obsidian commands.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_commands",
    "Get a list of all available commands in Obsidian. " +
      "Commands are actions that can be executed, like 'Toggle fold' or 'Export to PDF'.",
    {
      filter: z
        .string()
        .optional()
        .describe("Filter commands by name (case-insensitive)."),
    },
    async ({ filter }) => {
      try {
        const commands = await client.getCommands();

        let filteredCommands = commands;
        if (filter) {
          const lowerFilter = filter.toLowerCase();
          filteredCommands = commands.filter(
            (cmd) =>
              cmd.name.toLowerCase().includes(lowerFilter) ||
              cmd.id.toLowerCase().includes(lowerFilter)
          );
        }

        // Sort by name
        filteredCommands.sort((a, b) => a.name.localeCompare(b.name));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  filter: filter || null,
                  totalCommands: commands.length,
                  showing: filteredCommands.length,
                  commands: filteredCommands.map((cmd) => ({
                    id: cmd.id,
                    name: cmd.name,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof ObsidianApiError ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `Error getting commands: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: execute_command
  // ---------------------------------------------------------------------------
  // Execute an Obsidian command.
  // ---------------------------------------------------------------------------

  server.tool(
    "execute_command",
    "Execute an Obsidian command by its ID. " +
      "Use get_commands to find available commands and their IDs. " +
      "Examples: 'app:toggle-left-sidebar', 'editor:toggle-fold'",
    {
      commandId: z.string().describe("The command ID to execute."),
    },
    async ({ commandId }) => {
      try {
        await client.executeCommand(commandId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Command executed: ${commandId}`,
                  commandId,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof ObsidianApiError ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `Error executing command: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: quick_capture
  // ---------------------------------------------------------------------------
  // Quickly capture a thought or note to a designated capture file.
  // ---------------------------------------------------------------------------

  server.tool(
    "quick_capture",
    "Quickly capture a thought, idea, or note. " +
      "Appends to a designated capture file with timestamp. " +
      "Great for inbox-style note capture.",
    {
      content: z.string().describe("Content to capture."),
      captureFile: z
        .string()
        .optional()
        .default("Inbox.md")
        .describe("File to capture to (default: Inbox.md)."),
      addTimestamp: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to add a timestamp."),
      format: z
        .enum(["bullet", "checkbox", "paragraph"])
        .optional()
        .default("bullet")
        .describe("Format for the capture (bullet, checkbox, or paragraph)."),
    },
    async ({ content, captureFile, addTimestamp, format }) => {
      try {
        const filePath = captureFile!.endsWith(".md")
          ? captureFile!
          : `${captureFile}.md`;

        // Format the content
        let formattedContent: string;
        const timestamp = addTimestamp
          ? new Date().toLocaleString()
          : "";

        switch (format) {
          case "checkbox":
            formattedContent = timestamp
              ? `- [ ] [${timestamp}] ${content}`
              : `- [ ] ${content}`;
            break;
          case "paragraph":
            formattedContent = timestamp ? `**${timestamp}**\n${content}` : content;
            break;
          case "bullet":
          default:
            formattedContent = timestamp
              ? `- [${timestamp}] ${content}`
              : `- ${content}`;
        }

        // Append to capture file
        try {
          await client.appendToFile(filePath, `\n${formattedContent}`);
        } catch (error) {
          // File might not exist, create it
          if (error instanceof ObsidianApiError && error.status === 404) {
            const initialContent = `# Inbox\n\n${formattedContent}`;
            await client.putFile(filePath, initialContent);
          } else {
            throw error;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Captured to: ${filePath}`,
                  captureFile: filePath,
                  timestamp: addTimestamp ? timestamp : null,
                  format,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof ObsidianApiError ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `Error capturing: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
