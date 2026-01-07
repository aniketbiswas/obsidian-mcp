/**
 * ============================================================================
 * OBSIDIAN MCP - Metadata Tools
 * ============================================================================
 *
 * Tools for managing note metadata: frontmatter, tags, aliases, and properties.
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
  addTags,
  removeTags,
  getAllTags,
  addAliases,
} from "../utils/frontmatter.js";

/**
 * Register metadata tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client
 */
export function registerMetadataTools(server: McpServer, client: ObsidianClient): void {
  // ---------------------------------------------------------------------------
  // TOOL: get_frontmatter
  // ---------------------------------------------------------------------------
  // Read frontmatter from a note.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_frontmatter",
    "Get the frontmatter (YAML metadata) from a note. " +
      "Returns all frontmatter fields including tags, aliases, and custom properties.",
    {
      path: z.string().describe("Path to the note."),
    },
    async ({ path }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;
        const note = await client.getNote(filePath);

        if (!note.frontmatter || Object.keys(note.frontmatter).length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    path: filePath,
                    hasFrontmatter: false,
                    frontmatter: {},
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  path: filePath,
                  hasFrontmatter: true,
                  frontmatter: note.frontmatter,
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
              text: `Error getting frontmatter: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: update_frontmatter
  // ---------------------------------------------------------------------------
  // Update frontmatter fields in a note.
  // ---------------------------------------------------------------------------

  server.tool(
    "update_frontmatter",
    "Update frontmatter fields in a note. " +
      "Can add new fields or update existing ones. " +
      "Existing fields not specified are preserved.",
    {
      path: z.string().describe("Path to the note."),
      properties: z
        .object({
          title: z.string().optional(),
          tags: z.array(z.string()).optional(),
          aliases: z.array(z.string()).optional(),
          created: z.string().optional(),
          modified: z.string().optional(),
          publish: z.boolean().optional(),
        })
        .passthrough()
        .describe("Frontmatter properties to set or update."),
    },
    async ({ path, properties }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Get current content
        const content = await client.getFile(filePath);

        // Update frontmatter
        const updatedContent = updateFrontmatter(
          content,
          properties as StandardFrontmatter
        );

        // Write back
        await client.putFile(filePath, updatedContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Frontmatter updated for: ${filePath}`,
                  path: filePath,
                  updatedProperties: Object.keys(properties),
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
              text: `Error updating frontmatter: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: set_frontmatter_property
  // ---------------------------------------------------------------------------
  // Set a single frontmatter property.
  // ---------------------------------------------------------------------------

  server.tool(
    "set_frontmatter_property",
    "Set a single frontmatter property in a note. " +
      "Creates the property if it doesn't exist.",
    {
      path: z.string().describe("Path to the note."),
      key: z.string().describe("Property name to set."),
      value: z
        .union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.string()),
          z.null(),
        ])
        .describe("Value to set (string, number, boolean, string array, or null to remove)."),
    },
    async ({ path, key, value }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Get current content
        const content = await client.getFile(filePath);
        const { frontmatter, body } = parseFrontmatter(content);

        // Update property
        if (value === null) {
          delete frontmatter[key];
        } else {
          frontmatter[key] = value;
        }

        // Rebuild content
        const newContent =
          stringifyFrontmatter(frontmatter as StandardFrontmatter) + body;

        await client.putFile(filePath, newContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message:
                    value === null
                      ? `Property "${key}" removed from: ${filePath}`
                      : `Property "${key}" set in: ${filePath}`,
                  path: filePath,
                  property: key,
                  value: value,
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
              text: `Error setting property: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_tags
  // ---------------------------------------------------------------------------
  // Get all tags from a note (frontmatter + inline).
  // ---------------------------------------------------------------------------

  server.tool(
    "get_tags",
    "Get all tags from a note. " +
      "Includes tags from frontmatter and inline tags (#tag) in the content.",
    {
      path: z.string().describe("Path to the note."),
    },
    async ({ path }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;
        const content = await client.getFile(filePath);
        const tags = getAllTags(content);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  path: filePath,
                  tagCount: tags.length,
                  tags,
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
              text: `Error getting tags: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: add_tags
  // ---------------------------------------------------------------------------
  // Add tags to a note's frontmatter.
  // ---------------------------------------------------------------------------

  server.tool(
    "add_tags",
    "Add tags to a note's frontmatter. " +
      "Tags are added without duplicates. Creates frontmatter if needed.",
    {
      path: z.string().describe("Path to the note."),
      tags: z
        .array(z.string())
        .min(1)
        .describe("Tags to add (with or without # prefix)."),
    },
    async ({ path, tags }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Get current content
        const content = await client.getFile(filePath);

        // Add tags
        const updatedContent = addTags(content, tags);

        // Write back
        await client.putFile(filePath, updatedContent);

        // Get final tags
        const finalTags = getAllTags(updatedContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Tags added to: ${filePath}`,
                  path: filePath,
                  addedTags: tags,
                  allTags: finalTags,
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
              text: `Error adding tags: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: remove_tags
  // ---------------------------------------------------------------------------
  // Remove tags from a note's frontmatter.
  // ---------------------------------------------------------------------------

  server.tool(
    "remove_tags",
    "Remove tags from a note's frontmatter. " +
      "Only removes tags from frontmatter, not inline tags.",
    {
      path: z.string().describe("Path to the note."),
      tags: z
        .array(z.string())
        .min(1)
        .describe("Tags to remove (with or without # prefix)."),
    },
    async ({ path, tags }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Get current content
        const content = await client.getFile(filePath);

        // Remove tags
        const updatedContent = removeTags(content, tags);

        // Write back
        await client.putFile(filePath, updatedContent);

        // Get final tags
        const finalTags = getAllTags(updatedContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Tags removed from: ${filePath}`,
                  path: filePath,
                  removedTags: tags,
                  remainingTags: finalTags,
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
              text: `Error removing tags: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: add_aliases
  // ---------------------------------------------------------------------------
  // Add aliases to a note's frontmatter.
  // ---------------------------------------------------------------------------

  server.tool(
    "add_aliases",
    "Add aliases (alternative names) to a note's frontmatter. " +
      "Aliases help find notes by different names.",
    {
      path: z.string().describe("Path to the note."),
      aliases: z.array(z.string()).min(1).describe("Aliases to add."),
    },
    async ({ path, aliases }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Get current content
        const content = await client.getFile(filePath);

        // Add aliases
        const updatedContent = addAliases(content, aliases);

        // Write back
        await client.putFile(filePath, updatedContent);

        // Get updated frontmatter
        const { frontmatter } = parseFrontmatter(updatedContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Aliases added to: ${filePath}`,
                  path: filePath,
                  addedAliases: aliases,
                  allAliases: frontmatter.aliases || [],
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
              text: `Error adding aliases: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_all_tags_in_vault
  // ---------------------------------------------------------------------------
  // Get all unique tags used across the vault.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_all_tags_in_vault",
    "Get a list of all unique tags used across the entire vault. " +
      "Useful for understanding tag taxonomy and finding related notes.",
    {
      folder: z
        .string()
        .optional()
        .describe("Optional folder to limit the search."),
    },
    async ({ folder }) => {
      try {
        // Get all markdown files
        const allFiles = await client.listAllFiles(folder || "", 10);
        const mdFiles = allFiles.filter(
          (f) => f.type === "file" && f.extension === "md"
        );

        // Collect all tags
        const tagCounts: Record<string, number> = {};

        for (const file of mdFiles.slice(0, 500)) {
          // Limit to avoid timeout
          try {
            const content = await client.getFile(file.path);
            const tags = getAllTags(content);

            for (const tag of tags) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          } catch {
            // Skip files that can't be read
          }
        }

        // Sort by count
        const sortedTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([tag, count]) => ({ tag, count }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  folder: folder || "/",
                  filesScanned: Math.min(mdFiles.length, 500),
                  uniqueTags: sortedTags.length,
                  tags: sortedTags,
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
              text: `Error getting vault tags: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
