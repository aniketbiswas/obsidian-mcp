/**
 * ============================================================================
 * OBSIDIAN MCP - Link Analysis Tools
 * ============================================================================
 *
 * Tools for analyzing links between notes: backlinks, outgoing links,
 * graph analysis, and finding orphan notes.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObsidianClient } from "../utils/client.js";
import { ObsidianApiError, NoteLink } from "../types/obsidian.js";
import {
  extractInternalLinks,
  extractExternalLinks,
  extractAllLinks,
  createWikilink,
} from "../utils/markdown.js";

/**
 * Register link analysis tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client
 */
export function registerLinkTools(server: McpServer, client: ObsidianClient): void {
  // ---------------------------------------------------------------------------
  // TOOL: get_outgoing_links
  // ---------------------------------------------------------------------------
  // Get all links from a note.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_outgoing_links",
    "Get all outgoing links from a note. " +
      "Returns internal links ([[note]]), external links, and tags.",
    {
      path: z.string().describe("Path to the note."),
    },
    async ({ path }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;
        const content = await client.getFile(filePath);

        const links = extractAllLinks(content, filePath);

        // Separate by type
        const internal = links.filter((l) => l.type === "internal");
        const external = links.filter((l) => l.type === "external");
        const tags = links.filter((l) => l.type === "tag");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  path: filePath,
                  totalLinks: links.length,
                  internalLinks: internal.map((l) => ({
                    target: l.target,
                    displayText: l.displayText,
                    isEmbed: l.isEmbed,
                  })),
                  externalLinks: external.map((l) => ({
                    url: l.target,
                    displayText: l.displayText,
                  })),
                  tags: tags.map((l) => l.target),
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
              text: `Error getting outgoing links: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_backlinks
  // ---------------------------------------------------------------------------
  // Find all notes that link to a specific note.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_backlinks",
    "Find all notes that link to a specific note (backlinks). " +
      "Searches the entire vault for [[note]] references.",
    {
      path: z.string().describe("Path to the note to find backlinks for."),
      includeContext: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include the context around each backlink."),
    },
    async ({ path, includeContext }) => {
      try {
        const filePath = path.endsWith(".md") ? path : `${path}.md`;

        // Extract the note name (without path and extension) for searching
        const noteName = filePath
          .split("/")
          .pop()!
          .replace(/\.md$/, "");

        // Search for [[noteName]] in all files
        const searchResults = await client.search(`[[${noteName}]]`);

        // Filter out self-references
        const backlinks = searchResults.filter(
          (r) => r.filename.toLowerCase() !== filePath.toLowerCase()
        );

        const results = await Promise.all(
          backlinks.map(async (result) => {
            const item: Record<string, unknown> = {
              source: result.filename,
            };

            if (includeContext && result.matches) {
              item.contexts = result.matches.slice(0, 3).map((m) => m.match);
            }

            return item;
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  target: filePath,
                  backlinksCount: results.length,
                  backlinks: results,
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
              text: `Error getting backlinks: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: find_broken_links
  // ---------------------------------------------------------------------------
  // Find links that point to non-existent notes.
  // ---------------------------------------------------------------------------

  server.tool(
    "find_broken_links",
    "Find broken internal links in the vault. " +
      "Identifies [[links]] that point to notes that don't exist.",
    {
      folder: z
        .string()
        .optional()
        .describe("Folder to check. Defaults to entire vault."),
    },
    async ({ folder }) => {
      try {
        // Get all markdown files
        const allFiles = await client.listAllFiles(folder || "", 10);
        const mdFiles = allFiles.filter(
          (f) => f.type === "file" && f.extension === "md"
        );

        // Build a set of existing note paths (without extension)
        const existingNotes = new Set<string>();
        for (const file of mdFiles) {
          // Add with path
          existingNotes.add(file.path.toLowerCase());
          // Add without .md extension
          existingNotes.add(file.path.replace(/\.md$/, "").toLowerCase());
          // Add just the filename
          const filename = file.path.split("/").pop()!.replace(/\.md$/, "");
          existingNotes.add(filename.toLowerCase());
        }

        const brokenLinks: Array<{ source: string; target: string }> = [];

        // Check each file for broken links
        for (const file of mdFiles.slice(0, 200)) {
          // Limit to avoid timeout
          try {
            const content = await client.getFile(file.path);
            const internalLinks = extractInternalLinks(content);

            for (const link of internalLinks) {
              // Check if target exists
              const target = link.target.split("#")[0]; // Remove heading reference
              const targetLower = target.toLowerCase();

              // Check various forms of the target
              const exists =
                existingNotes.has(targetLower) ||
                existingNotes.has(`${targetLower}.md`) ||
                mdFiles.some(
                  (f) =>
                    f.path.toLowerCase().endsWith(`/${targetLower}.md`) ||
                    f.path.toLowerCase().endsWith(`/${targetLower}`)
                );

              if (!exists) {
                brokenLinks.push({
                  source: file.path,
                  target: link.target,
                });
              }
            }
          } catch {
            // Skip files that can't be read
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  folder: folder || "/",
                  filesChecked: Math.min(mdFiles.length, 200),
                  brokenLinksCount: brokenLinks.length,
                  brokenLinks,
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
              text: `Error finding broken links: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: find_orphan_notes
  // ---------------------------------------------------------------------------
  // Find notes that have no incoming or outgoing links.
  // ---------------------------------------------------------------------------

  server.tool(
    "find_orphan_notes",
    "Find orphan notes - notes with no incoming links from other notes. " +
      "These are notes that aren't connected to the rest of your knowledge graph.",
    {
      folder: z
        .string()
        .optional()
        .describe("Folder to check. Defaults to entire vault."),
      includeUnlinked: z
        .boolean()
        .optional()
        .default(false)
        .describe("Also include notes that don't link to anything."),
    },
    async ({ folder, includeUnlinked }) => {
      try {
        // Get all markdown files
        const allFiles = await client.listAllFiles(folder || "", 10);
        const mdFiles = allFiles.filter(
          (f) => f.type === "file" && f.extension === "md"
        );

        // Track which notes are linked to
        const linkedTo = new Set<string>();
        const hasOutgoingLinks = new Set<string>();

        // Build link map
        for (const file of mdFiles.slice(0, 300)) {
          try {
            const content = await client.getFile(file.path);
            const links = extractInternalLinks(content);

            if (links.length > 0) {
              hasOutgoingLinks.add(file.path);
            }

            for (const link of links) {
              const target = link.target.split("#")[0];
              // Add various forms of the target
              linkedTo.add(target.toLowerCase());
              linkedTo.add(`${target.toLowerCase()}.md`);
            }
          } catch {
            // Skip files that can't be read
          }
        }

        // Find orphans (notes not linked to)
        const orphans: Array<{ path: string; hasOutgoingLinks: boolean }> = [];

        for (const file of mdFiles) {
          const noteName = file.path
            .split("/")
            .pop()!
            .replace(/\.md$/, "")
            .toLowerCase();
          const isLinkedTo =
            linkedTo.has(noteName) ||
            linkedTo.has(`${noteName}.md`) ||
            linkedTo.has(file.path.toLowerCase());

          if (!isLinkedTo) {
            const hasLinks = hasOutgoingLinks.has(file.path);
            if (!includeUnlinked || !hasLinks) {
              orphans.push({
                path: file.path,
                hasOutgoingLinks: hasLinks,
              });
            }
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  folder: folder || "/",
                  totalNotes: mdFiles.length,
                  orphanCount: orphans.length,
                  orphans: orphans.slice(0, 100),
                  truncated: orphans.length > 100,
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
              text: `Error finding orphan notes: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: add_link_to_note
  // ---------------------------------------------------------------------------
  // Add an internal link to another note.
  // ---------------------------------------------------------------------------

  server.tool(
    "add_link_to_note",
    "Add an internal link ([[note]]) to a note. " +
      "Can append to the end or insert at a specific location.",
    {
      sourcePath: z.string().describe("Path to the note to add the link to."),
      targetPath: z.string().describe("Path of the note to link to."),
      displayText: z
        .string()
        .optional()
        .describe("Optional display text for the link."),
      position: z
        .enum(["append", "prepend"])
        .optional()
        .default("append")
        .describe("Where to add the link (append or prepend)."),
      asListItem: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to format as a list item (- [[link]])."),
    },
    async ({ sourcePath, targetPath, displayText, position, asListItem }) => {
      try {
        const sourceFile = sourcePath.endsWith(".md")
          ? sourcePath
          : `${sourcePath}.md`;
        const targetNote = targetPath.replace(/\.md$/, "");

        const wikilink = createWikilink(targetNote, displayText);
        const content = asListItem ? `- ${wikilink}` : wikilink;

        if (position === "prepend") {
          await client.patchFile(sourceFile, `${content}\n`, {
            operation: "prepend",
          });
        } else {
          await client.appendToFile(sourceFile, `\n${content}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Link added to ${sourceFile}`,
                  source: sourceFile,
                  target: targetNote,
                  link: wikilink,
                  position,
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
              text: `Error adding link: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_link_graph_data
  // ---------------------------------------------------------------------------
  // Get data for building a link graph visualization.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_link_graph_data",
    "Get link graph data for a folder or the entire vault. " +
      "Returns nodes (notes) and edges (links) for visualization.",
    {
      folder: z
        .string()
        .optional()
        .describe("Folder to analyze. Defaults to entire vault."),
      maxNotes: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .default(100)
        .describe("Maximum number of notes to include (default: 100)."),
    },
    async ({ folder, maxNotes }) => {
      try {
        // Get all markdown files
        const allFiles = await client.listAllFiles(folder || "", 10);
        const mdFiles = allFiles
          .filter((f) => f.type === "file" && f.extension === "md")
          .slice(0, maxNotes);

        const nodes: Array<{ id: string; label: string }> = [];
        const edges: Array<{ source: string; target: string }> = [];
        const noteNames = new Set<string>();

        // Create node for each file
        for (const file of mdFiles) {
          const noteName = file.path.replace(/\.md$/, "");
          const label = file.path.split("/").pop()!.replace(/\.md$/, "");
          nodes.push({ id: noteName, label });
          noteNames.add(noteName.toLowerCase());
        }

        // Extract links and create edges
        for (const file of mdFiles) {
          try {
            const content = await client.getFile(file.path);
            const links = extractInternalLinks(content);
            const sourceName = file.path.replace(/\.md$/, "");

            for (const link of links) {
              if (!link.isEmbed) {
                const target = link.target.split("#")[0];
                // Only add edge if target exists in our nodes
                if (noteNames.has(target.toLowerCase())) {
                  edges.push({
                    source: sourceName,
                    target,
                  });
                }
              }
            }
          } catch {
            // Skip files that can't be read
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  folder: folder || "/",
                  nodeCount: nodes.length,
                  edgeCount: edges.length,
                  nodes,
                  edges,
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
              text: `Error getting graph data: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
