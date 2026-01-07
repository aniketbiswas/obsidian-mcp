/**
 * ============================================================================
 * OBSIDIAN MCP - Vault Tools
 * ============================================================================
 *
 * Tools for exploring and managing the Obsidian vault structure.
 * Includes listing files/folders, getting vault statistics, and file operations.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObsidianClient } from "../utils/client.js";
import { VaultItem, ObsidianApiError } from "../types/obsidian.js";

/**
 * Register vault-related tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client
 */
export function registerVaultTools(server: McpServer, client: ObsidianClient): void {
  // ---------------------------------------------------------------------------
  // TOOL: vault_status
  // ---------------------------------------------------------------------------
  // Check the connection status and get basic vault information.
  // ---------------------------------------------------------------------------

  server.tool(
    "vault_status",
    "Check the connection to Obsidian and get server status information. " +
      "Use this to verify the MCP server can communicate with Obsidian.",
    {},
    async () => {
      try {
        const status = await client.getServerStatus();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  connected: status.authenticated,
                  obsidianVersion: status.versions.obsidian,
                  apiVersion: status.versions.self,
                  service: status.service,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof ObsidianApiError
            ? error.message
            : "Failed to connect to Obsidian";

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: message,
                  hint: "Make sure Obsidian is running and the Local REST API plugin is enabled.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: list_files
  // ---------------------------------------------------------------------------
  // List files and folders in the vault or a specific directory.
  // ---------------------------------------------------------------------------

  server.tool(
    "list_files",
    "List files and folders in the Obsidian vault. " +
      "Can list the root directory or a specific folder. " +
      "Returns names of files and directories (directories end with /).",
    {
      path: z
        .string()
        .optional()
        .describe(
          "Directory path relative to vault root. Leave empty for root directory."
        ),
    },
    async ({ path }) => {
      try {
        const files = await client.listDirectory(path);

        // Separate files and directories
        const directories = files.filter((f) => f.endsWith("/"));
        const regularFiles = files.filter((f) => !f.endsWith("/"));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  path: path || "/",
                  directories: directories.map((d) => d.slice(0, -1)),
                  files: regularFiles,
                  totalItems: files.length,
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
              text: `Error listing files: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: list_all_files
  // ---------------------------------------------------------------------------
  // Recursively list all files in the vault.
  // ---------------------------------------------------------------------------

  server.tool(
    "list_all_files",
    "Recursively list all files in the Obsidian vault. " +
      "Can start from a specific directory and filter by file extension. " +
      "Useful for getting a complete view of vault structure.",
    {
      path: z
        .string()
        .optional()
        .describe("Starting directory path. Leave empty for entire vault."),
      extensions: z
        .array(z.string())
        .optional()
        .describe(
          "File extensions to filter by (e.g., ['md', 'pdf']). Leave empty for all files."
        ),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe("Maximum depth to recurse into subdirectories (default: 10)."),
    },
    async ({ path, extensions, maxDepth }) => {
      try {
        const items = await client.listAllFiles(path || "", maxDepth || 10);

        // Filter by extension if specified
        let filteredItems = items;
        if (extensions && extensions.length > 0) {
          const extSet = new Set(extensions.map((e) => e.toLowerCase()));
          filteredItems = items.filter(
            (item) =>
              item.type === "directory" ||
              (item.extension && extSet.has(item.extension.toLowerCase()))
          );
        }

        // Organize by type
        const directories = filteredItems
          .filter((i) => i.type === "directory")
          .map((i) => i.path);
        const files = filteredItems
          .filter((i) => i.type === "file")
          .map((i) => ({
            path: i.path,
            extension: i.extension,
          }));

        // Get extension statistics
        const extensionCounts: Record<string, number> = {};
        for (const file of files) {
          const ext = file.extension || "no-extension";
          extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  basePath: path || "/",
                  totalDirectories: directories.length,
                  totalFiles: files.length,
                  extensionCounts,
                  directories: directories.slice(0, 100), // Limit output
                  files: files.slice(0, 200), // Limit output
                  truncated:
                    directories.length > 100 || files.length > 200
                      ? "Results truncated. Use path filter for specific directories."
                      : undefined,
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
              text: `Error listing files: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_vault_structure
  // ---------------------------------------------------------------------------
  // Get a tree-like structure of the vault.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_vault_structure",
    "Get a tree-like structure of folders in the Obsidian vault. " +
      "Useful for understanding the vault organization. " +
      "Only shows directories, not individual files.",
    {
      path: z
        .string()
        .optional()
        .describe("Starting directory path. Leave empty for entire vault."),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Maximum depth to show (default: 5)."),
    },
    async ({ path, maxDepth }) => {
      try {
        const items = await client.listAllFiles(path || "", maxDepth || 5);

        // Build tree structure
        const tree = buildDirectoryTree(
          items.filter((i) => i.type === "directory"),
          path || ""
        );

        // Format as tree string
        const treeString = formatTree(tree, "");

        return {
          content: [
            {
              type: "text",
              text: `Vault Structure:\n\n${treeString || "(empty)"}`,
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
              text: `Error getting vault structure: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_file_stats
  // ---------------------------------------------------------------------------
  // Get statistics about files in a directory.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_file_stats",
    "Get statistics about files in the vault or a specific directory. " +
      "Shows file counts by extension, total files, and directory counts.",
    {
      path: z
        .string()
        .optional()
        .describe("Directory path to analyze. Leave empty for entire vault."),
    },
    async ({ path }) => {
      try {
        const items = await client.listAllFiles(path || "", 15);

        const files = items.filter((i) => i.type === "file");
        const directories = items.filter((i) => i.type === "directory");

        // Count by extension
        const extensionCounts: Record<string, number> = {};
        for (const file of files) {
          const ext = file.extension || "no-extension";
          extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
        }

        // Sort extensions by count
        const sortedExtensions = Object.entries(extensionCounts)
          .sort((a, b) => b[1] - a[1])
          .reduce(
            (obj, [k, v]) => {
              obj[k] = v;
              return obj;
            },
            {} as Record<string, number>
          );

        // Count markdown files
        const markdownCount = extensionCounts["md"] || 0;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  path: path || "/",
                  statistics: {
                    totalFiles: files.length,
                    totalDirectories: directories.length,
                    markdownNotes: markdownCount,
                    otherFiles: files.length - markdownCount,
                  },
                  byExtension: sortedExtensions,
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
              text: `Error getting file stats: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: delete_file
  // ---------------------------------------------------------------------------
  // Delete a file from the vault.
  // ---------------------------------------------------------------------------

  server.tool(
    "delete_file",
    "Delete a file from the Obsidian vault. " +
      "WARNING: This permanently removes the file. Use with caution.",
    {
      path: z.string().describe("Path to the file to delete (relative to vault root)."),
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
              text: "Deletion not confirmed. Set confirm=true to delete the file.",
            },
          ],
          isError: true,
        };
      }

      try {
        await client.deleteFile(path);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `File deleted: ${path}`,
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
              text: `Error deleting file: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
}

/**
 * Build a tree structure from a flat list of directories.
 */
function buildDirectoryTree(directories: VaultItem[], basePath: string): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort directories by path depth
  const sortedDirs = directories.sort((a, b) => {
    const depthA = a.path.split("/").length;
    const depthB = b.path.split("/").length;
    return depthA - depthB;
  });

  for (const dir of sortedDirs) {
    const node: TreeNode = {
      name: dir.name,
      path: dir.path,
      children: [],
    };

    nodeMap.set(dir.path, node);

    // Find parent
    const pathParts = dir.path.split("/");
    pathParts.pop();
    const parentPath = pathParts.join("/");

    if (parentPath && nodeMap.has(parentPath)) {
      nodeMap.get(parentPath)!.children.push(node);
    } else if (!parentPath || parentPath === basePath.replace(/\/$/, "")) {
      root.push(node);
    }
  }

  return root;
}

/**
 * Format a tree structure as a string.
 */
function formatTree(nodes: TreeNode[], prefix: string): string {
  const lines: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";

    lines.push(`${prefix}${connector}📁 ${node.name}`);

    if (node.children.length > 0) {
      lines.push(formatTree(node.children, prefix + childPrefix));
    }
  }

  return lines.join("\n");
}
