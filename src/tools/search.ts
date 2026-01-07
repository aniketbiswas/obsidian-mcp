/**
 * ============================================================================
 * OBSIDIAN MCP - Search Tools
 * ============================================================================
 *
 * Tools for searching notes in the Obsidian vault.
 * Supports full-text search, tag search, and pattern matching.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObsidianClient } from "../utils/client.js";
import { ObsidianApiError } from "../types/obsidian.js";
import { getAllTags } from "../utils/frontmatter.js";
import { getSummary } from "../utils/markdown.js";

/**
 * Register search tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client
 */
export function registerSearchTools(server: McpServer, client: ObsidianClient): void {
  // ---------------------------------------------------------------------------
  // TOOL: search_notes
  // ---------------------------------------------------------------------------
  // Full-text search across the vault using Obsidian's search syntax.
  // ---------------------------------------------------------------------------

  server.tool(
    "search_notes",
    "Search for notes in the Obsidian vault using Obsidian's query syntax. " +
      "Supports operators like: path:, file:, tag:#, content in quotes, and more. " +
      "Returns matching files with relevance scores.",
    {
      query: z
        .string()
        .describe(
          "Search query. Supports Obsidian search syntax like: " +
            '"exact phrase", path:folder/, tag:#mytag, file:name'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Maximum number of results to return (default: 20)."),
    },
    async ({ query, limit }) => {
      try {
        const results = await client.search(query);

        // Sort by score if available and limit results
        const sortedResults = results
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query,
                  totalResults: results.length,
                  showing: sortedResults.length,
                  results: sortedResults.map((r) => ({
                    path: r.filename,
                    score: r.score,
                    matches: r.matches?.slice(0, 3), // Limit matches per file
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
              text: `Error searching notes: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: simple_search
  // ---------------------------------------------------------------------------
  // Simple text search across the vault.
  // ---------------------------------------------------------------------------

  server.tool(
    "simple_search",
    "Simple text search across all notes in the vault. " +
      "Searches for the exact text (case-insensitive). " +
      "Good for finding specific phrases or terms.",
    {
      query: z.string().describe("Text to search for in notes."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Maximum number of results to return (default: 20)."),
    },
    async ({ query, limit }) => {
      try {
        const results = await client.simpleSearch(query);

        const limitedResults = results.slice(0, limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query,
                  totalResults: results.length,
                  showing: limitedResults.length,
                  results: limitedResults.map((r) => ({
                    path: r.filename,
                    matches: r.matches?.slice(0, 3),
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
              text: `Error searching notes: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: search_by_tag
  // ---------------------------------------------------------------------------
  // Search for notes with specific tags.
  // ---------------------------------------------------------------------------

  server.tool(
    "search_by_tag",
    "Find all notes that have specific tags. " +
      "Tags can be in frontmatter or inline in the content. " +
      "Can search for multiple tags (notes must have all specified tags).",
    {
      tags: z
        .array(z.string())
        .min(1)
        .describe("Tags to search for (with or without # prefix)."),
      matchAll: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true, notes must have ALL tags. If false, notes with ANY tag match."),
    },
    async ({ tags, matchAll }) => {
      try {
        // Normalize tags (remove # if present)
        const normalizedTags = tags.map((t) =>
          t.startsWith("#") ? t.slice(1) : t
        );

        // Build Obsidian search query
        const tagQueries = normalizedTags.map((t) => `tag:#${t}`);
        const query = matchAll ? tagQueries.join(" ") : tagQueries.join(" OR ");

        const results = await client.search(query);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  searchedTags: normalizedTags,
                  matchMode: matchAll ? "ALL" : "ANY",
                  totalResults: results.length,
                  results: results.map((r) => r.filename),
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
              text: `Error searching by tag: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: search_in_folder
  // ---------------------------------------------------------------------------
  // Search within a specific folder.
  // ---------------------------------------------------------------------------

  server.tool(
    "search_in_folder",
    "Search for notes within a specific folder. " +
      "Combines folder path filtering with text search.",
    {
      folder: z.string().describe("Folder path to search in (e.g., 'Projects/Active')."),
      query: z
        .string()
        .optional()
        .describe("Optional text to search for within the folder."),
      includeSubfolders: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include subfolders in the search."),
    },
    async ({ folder, query, includeSubfolders }) => {
      try {
        // Build path query
        const pathQuery = includeSubfolders
          ? `path:"${folder}"`
          : `path:"${folder}/"`;

        const fullQuery = query ? `${pathQuery} ${query}` : pathQuery;

        const results = await client.search(fullQuery);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  folder,
                  searchQuery: query || "(all files)",
                  includeSubfolders,
                  totalResults: results.length,
                  results: results.map((r) => r.filename),
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
              text: `Error searching in folder: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: find_notes_by_name
  // ---------------------------------------------------------------------------
  // Find notes by filename pattern.
  // ---------------------------------------------------------------------------

  server.tool(
    "find_notes_by_name",
    "Find notes by their filename. " +
      "Searches for notes whose name contains the specified text.",
    {
      name: z.string().describe("Text that the filename should contain."),
      exactMatch: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, filename must match exactly (case-insensitive)."),
    },
    async ({ name, exactMatch }) => {
      try {
        // Use file: operator for filename search
        const query = exactMatch ? `file:"${name}.md"` : `file:${name}`;

        const results = await client.search(query);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  searchName: name,
                  matchMode: exactMatch ? "exact" : "contains",
                  totalResults: results.length,
                  results: results.map((r) => r.filename),
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
              text: `Error finding notes: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_recent_notes
  // ---------------------------------------------------------------------------
  // Get recently modified notes.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_recent_notes",
    "Get a list of recently modified markdown notes. " +
      "Useful for finding notes you've worked on recently.",
    {
      folder: z
        .string()
        .optional()
        .describe("Optional folder to limit the search to."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe("Maximum number of results (default: 10)."),
    },
    async ({ folder, limit }) => {
      try {
        // Get all markdown files
        const allFiles = await client.listAllFiles(folder || "", 10);
        const mdFiles = allFiles.filter(
          (f) => f.type === "file" && f.extension === "md"
        );

        // Since we don't have direct access to mtime from the API,
        // we'll return the files and suggest using file stats
        const results = mdFiles.slice(0, limit).map((f) => f.path);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  folder: folder || "/",
                  note: "Results sorted alphabetically. For true recency, use Obsidian's Recent Files core plugin.",
                  totalFiles: mdFiles.length,
                  showing: results.length,
                  results,
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
              text: `Error getting recent notes: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: search_with_context
  // ---------------------------------------------------------------------------
  // Search and return results with content context.
  // ---------------------------------------------------------------------------

  server.tool(
    "search_with_context",
    "Search notes and return results with content snippets/context. " +
      "Useful for previewing search results without opening each note.",
    {
      query: z.string().describe("Search query."),
      contextLength: z
        .number()
        .int()
        .min(50)
        .max(500)
        .optional()
        .default(150)
        .describe("Length of context snippet to show (default: 150)."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe("Maximum number of results (default: 10)."),
    },
    async ({ query, contextLength, limit }) => {
      try {
        const results = await client.search(query);
        const limitedResults = results.slice(0, limit);

        // Fetch content for each result
        const resultsWithContext = await Promise.all(
          limitedResults.map(async (result) => {
            try {
              const note = await client.getNote(result.filename);
              return {
                path: result.filename,
                score: result.score,
                snippet: getSummary(note.body || note.content, contextLength),
                tags: getAllTags(note.content),
              };
            } catch {
              return {
                path: result.filename,
                score: result.score,
                snippet: "(unable to load content)",
                tags: [],
              };
            }
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query,
                  totalResults: results.length,
                  showing: resultsWithContext.length,
                  results: resultsWithContext,
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
              text: `Error searching notes: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
