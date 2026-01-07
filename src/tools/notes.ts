/**
 * ============================================================================
 * OBSIDIAN MCP - Note Tools
 * ============================================================================
 *
 * Core tools for creating, reading, updating, and deleting notes.
 * These are the fundamental operations for note management.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObsidianClient } from "../utils/client.js";
import { ObsidianApiError, StandardFrontmatter } from "../types/obsidian.js";
import {
  parseFrontmatter,
  stringifyFrontmatter,
  updateFrontmatter,
} from "../utils/frontmatter.js";
import { getSummary, countWords } from "../utils/markdown.js";

/**
 * Register note CRUD tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client
 */
export function registerNoteTools(server: McpServer, client: ObsidianClient): void {
  // ---------------------------------------------------------------------------
  // TOOL: read_note
  // ---------------------------------------------------------------------------
  // Read the content of a note.
  // ---------------------------------------------------------------------------

  server.tool(
    "read_note",
    "Read the content of a note from the Obsidian vault. " +
      "Returns the full content including frontmatter, or can return parsed sections.",
    {
      path: z.string().describe("Path to the note file (e.g., 'folder/note.md')."),
      includeFrontmatter: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include frontmatter in the response."),
      includeStats: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include word count and summary."),
    },
    async ({ path, includeFrontmatter, includeStats }) => {
      try {
        // Ensure .md extension
        const filePath = path.endsWith(".md") ? path : `${path}.md`;
        const note = await client.getNote(filePath);

        const response: Record<string, unknown> = {
          success: true,
          path: filePath,
        };

        if (includeFrontmatter && note.frontmatter) {
          response.frontmatter = note.frontmatter;
        }

        response.content = includeFrontmatter ? note.content : note.body;

        if (includeStats) {
          response.stats = {
            wordCount: countWords(note.content),
            summary: getSummary(note.content, 150),
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
              text: `Error reading note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: create_note
  // ---------------------------------------------------------------------------
  // Create a new note in the vault.
  // ---------------------------------------------------------------------------

  server.tool(
    "create_note",
    "Create a new note in the Obsidian vault. " +
      "Can include frontmatter properties like tags, aliases, and custom fields.",
    {
      path: z
        .string()
        .describe(
          "Path for the new note (e.g., 'folder/note.md'). Will create parent folders if needed."
        ),
      content: z.string().describe("The markdown content for the note."),
      frontmatter: z
        .object({
          title: z.string().optional().describe("Note title"),
          tags: z.array(z.string()).optional().describe("Tags for the note"),
          aliases: z.array(z.string()).optional().describe("Alternative names for the note"),
          created: z.string().optional().describe("Creation date (ISO format)"),
        })
        .passthrough()
        .optional()
        .describe("Frontmatter properties to include in the note."),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to overwrite if the note already exists."),
    },
    async ({ path, content, frontmatter, overwrite }) => {
      try {
        // Ensure .md extension
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Check if file exists (unless overwrite is true)
        if (!overwrite) {
          try {
            await client.getFile(filePath);
            return {
              content: [
                {
                  type: "text",
                  text: `Note already exists: ${filePath}. Set overwrite=true to replace it.`,
                },
              ],
              isError: true,
            };
          } catch (error) {
            // File doesn't exist, which is what we want
            if (!(error instanceof ObsidianApiError && error.status === 404)) {
              throw error;
            }
          }
        }

        // Add creation timestamp if not provided
        const fm: StandardFrontmatter = {
          ...frontmatter,
          created: frontmatter?.created || new Date().toISOString(),
        };

        await client.createNote(filePath, content, fm);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Note created: ${filePath}`,
                  path: filePath,
                  frontmatter: fm,
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
              text: `Error creating note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: update_note
  // ---------------------------------------------------------------------------
  // Update an existing note's content.
  // ---------------------------------------------------------------------------

  server.tool(
    "update_note",
    "Update the content of an existing note in the Obsidian vault. " +
      "Replaces the entire content of the note.",
    {
      path: z.string().describe("Path to the note to update."),
      content: z.string().describe("New content for the note."),
      preserveFrontmatter: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to preserve existing frontmatter."),
      updateModified: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to update the 'modified' frontmatter field."),
    },
    async ({ path, content, preserveFrontmatter, updateModified }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        let finalContent = content;

        if (preserveFrontmatter) {
          // Get existing frontmatter
          const existingNote = await client.getNote(filePath);

          if (existingNote.frontmatter && Object.keys(existingNote.frontmatter).length > 0) {
            const fm = existingNote.frontmatter as StandardFrontmatter;

            if (updateModified) {
              fm.modified = new Date().toISOString();
            }

            finalContent = stringifyFrontmatter(fm) + content;
          }
        }

        await client.putFile(filePath, finalContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Note updated: ${filePath}`,
                  path: filePath,
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
              text: `Error updating note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: append_to_note
  // ---------------------------------------------------------------------------
  // Append content to an existing note.
  // ---------------------------------------------------------------------------

  server.tool(
    "append_to_note",
    "Append content to the end of an existing note. " +
      "Useful for adding new sections, logging entries, or updating lists.",
    {
      path: z.string().describe("Path to the note."),
      content: z.string().describe("Content to append."),
      ensureNewline: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to ensure content starts on a new line."),
      createIfMissing: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to create the note if it doesn't exist."),
    },
    async ({ path, content, ensureNewline, createIfMissing }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Check if file exists
        try {
          await client.getFile(filePath);
        } catch (error) {
          if (error instanceof ObsidianApiError && error.status === 404) {
            if (createIfMissing) {
              await client.putFile(filePath, content);
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      {
                        success: true,
                        message: `Note created and content added: ${filePath}`,
                        path: filePath,
                      },
                      null,
                      2
                    ),
                  },
                ],
              };
            }
            throw error;
          }
          throw error;
        }

        const contentToAppend = ensureNewline ? `\n${content}` : content;
        await client.appendToFile(filePath, contentToAppend);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Content appended to: ${filePath}`,
                  path: filePath,
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
              text: `Error appending to note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: prepend_to_note
  // ---------------------------------------------------------------------------
  // Prepend content to a note (after frontmatter).
  // ---------------------------------------------------------------------------

  server.tool(
    "prepend_to_note",
    "Prepend content to the beginning of a note (after frontmatter). " +
      "Useful for adding headers, timestamps, or important notices.",
    {
      path: z.string().describe("Path to the note."),
      content: z.string().describe("Content to prepend."),
      ensureNewline: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to ensure content ends with a newline."),
    },
    async ({ path, content, ensureNewline }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;
        const contentToAdd = ensureNewline ? `${content}\n` : content;

        await client.patchFile(filePath, contentToAdd, {
          operation: "prepend",
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Content prepended to: ${filePath}`,
                  path: filePath,
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
              text: `Error prepending to note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: insert_under_heading
  // ---------------------------------------------------------------------------
  // Insert content under a specific heading.
  // ---------------------------------------------------------------------------

  server.tool(
    "insert_under_heading",
    "Insert content under a specific heading in a note. " +
      "Useful for adding content to specific sections without modifying the rest.",
    {
      path: z.string().describe("Path to the note."),
      heading: z.string().describe("The heading text to insert under (without # symbols)."),
      content: z.string().describe("Content to insert."),
      createHeadingIfMissing: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to create the heading if it doesn't exist."),
      headingLevel: z
        .number()
        .int()
        .min(1)
        .max(6)
        .optional()
        .default(2)
        .describe("Heading level to use if creating (default: 2 for ##)."),
    },
    async ({ path, heading, content, createHeadingIfMissing, headingLevel }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Try to insert under the heading
        try {
          await client.patchFile(filePath, content, {
            operation: "insert-under-heading",
            heading,
          });
        } catch (error) {
          // If heading not found and we should create it
          if (createHeadingIfMissing) {
            const hashes = "#".repeat(headingLevel || 2);
            const newContent = `\n\n${hashes} ${heading}\n\n${content}`;
            await client.appendToFile(filePath, newContent);
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
                  message: `Content inserted under heading "${heading}" in: ${filePath}`,
                  path: filePath,
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
              text: `Error inserting under heading: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: replace_in_note
  // ---------------------------------------------------------------------------
  // Find and replace text in a note.
  // ---------------------------------------------------------------------------

  server.tool(
    "replace_in_note",
    "Find and replace text in a note. " +
      "Useful for making specific edits without replacing the entire content.",
    {
      path: z.string().describe("Path to the note."),
      find: z.string().describe("Text to find."),
      replace: z.string().describe("Text to replace with."),
      replaceAll: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to replace all occurrences."),
    },
    async ({ path, find, replace, replaceAll }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Get current content
        const currentContent = await client.getFile(filePath);

        // Perform replacement
        let newContent: string;
        let count = 0;

        if (replaceAll) {
          // Count occurrences
          const regex = new RegExp(escapeRegExp(find), "g");
          const matches = currentContent.match(regex);
          count = matches ? matches.length : 0;
          newContent = currentContent.replace(regex, replace);
        } else {
          count = currentContent.includes(find) ? 1 : 0;
          newContent = currentContent.replace(find, replace);
        }

        if (count === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    message: "Text not found in note.",
                    path: filePath,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        await client.putFile(filePath, newContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Replaced ${count} occurrence(s) in: ${filePath}`,
                  path: filePath,
                  replacements: count,
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
              text: `Error replacing in note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: delete_note
  // ---------------------------------------------------------------------------
  // Delete a note from the vault.
  // ---------------------------------------------------------------------------

  server.tool(
    "delete_note",
    "Delete a note from the Obsidian vault. " +
      "WARNING: This permanently removes the note. Use with caution.",
    {
      path: z.string().describe("Path to the note to delete."),
      confirm: z
        .boolean()
        .describe("Set to true to confirm deletion. Required safety check."),
    },
    async ({ path, confirm }) => {
      if (!confirm) {
        return {
          content: [
            {
              type: "text",
              text: "Deletion not confirmed. Set confirm=true to delete the note.",
            },
          ],
          isError: true,
        };
      }

      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;
        await client.deleteFile(filePath);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Note deleted: ${filePath}`,
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
              text: `Error deleting note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: copy_note
  // ---------------------------------------------------------------------------
  // Copy a note to a new location.
  // ---------------------------------------------------------------------------

  server.tool(
    "copy_note",
    "Copy a note to a new location in the vault. " +
      "The original note is preserved.",
    {
      sourcePath: z.string().describe("Path of the note to copy."),
      destinationPath: z.string().describe("Path for the new copy."),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to overwrite if destination exists."),
    },
    async ({ sourcePath, destinationPath, overwrite }) => {
      try {
        const srcPath = sourcePath.endsWith(".md") ? sourcePath : `${sourcePath}.md`;
        const dstPath = destinationPath.endsWith(".md")
          ? destinationPath
          : `${destinationPath}.md`;

        // Check if destination exists
        if (!overwrite) {
          try {
            await client.getFile(dstPath);
            return {
              content: [
                {
                  type: "text",
                  text: `Destination already exists: ${dstPath}. Set overwrite=true to replace it.`,
                },
              ],
              isError: true,
            };
          } catch (error) {
            if (!(error instanceof ObsidianApiError && error.status === 404)) {
              throw error;
            }
          }
        }

        // Read source and write to destination
        const content = await client.getFile(srcPath);
        await client.putFile(dstPath, content);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Note copied from ${srcPath} to ${dstPath}`,
                  source: srcPath,
                  destination: dstPath,
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
              text: `Error copying note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Escape special characters for use in RegExp.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
