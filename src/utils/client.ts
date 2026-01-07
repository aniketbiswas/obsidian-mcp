/**
 * ============================================================================
 * OBSIDIAN MCP - Obsidian REST API Client
 * ============================================================================
 *
 * A robust HTTP client for interacting with Obsidian's Local REST API.
 * Features:
 * - Automatic authentication
 * - Error handling with detailed error messages
 * - Support for all REST API endpoints
 * - Request timeout handling
 * - SSL/TLS configuration for self-signed certificates
 * ============================================================================
 */

import https from "https";
import http from "http";
import {
  ObsidianConfig,
  ServerStatus,
  VaultItem,
  NoteContent,
  SearchResult,
  ObsidianCommand,
  PatchOptions,
  PeriodicNotePeriod,
  PeriodicNoteDate,
  ObsidianApiError,
  StandardFrontmatter,
} from "../types/obsidian.js";
import { getBaseUrl } from "./config.js";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.js";

/**
 * HTTP methods supported by the client
 */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Request options for the HTTP client
 */
interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: string | Buffer;
  contentType?: string;
  headers?: Record<string, string>;
}

/**
 * Response from the HTTP client
 */
interface HttpResponse<T = unknown> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
}

/**
 * Obsidian REST API Client
 *
 * Provides a type-safe interface for all Obsidian Local REST API operations.
 */
export class ObsidianClient {
  private readonly config: ObsidianConfig;
  private readonly baseUrl: string;
  private readonly agent: https.Agent | http.Agent;

  constructor(config: ObsidianConfig) {
    this.config = config;
    this.baseUrl = getBaseUrl(config);

    // Create appropriate agent based on protocol
    if (config.secure) {
      this.agent = new https.Agent({
        rejectUnauthorized: config.verifySsl,
      });
    } else {
      this.agent = new http.Agent();
    }
  }

  // ===========================================================================
  // SYSTEM ENDPOINTS
  // ===========================================================================

  /**
   * Get server status and version information.
   */
  async getServerStatus(): Promise<ServerStatus> {
    const response = await this.request<ServerStatus>({
      method: "GET",
      path: "/",
    });
    return response.data;
  }

  /**
   * Check if the server is reachable and authenticated.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const status = await this.getServerStatus();
      return status.authenticated === true;
    } catch {
      return false;
    }
  }

  /**
   * Get the list of available commands in Obsidian.
   */
  async getCommands(): Promise<ObsidianCommand[]> {
    const response = await this.request<{ commands: ObsidianCommand[] }>({
      method: "GET",
      path: "/commands/",
    });
    return response.data.commands;
  }

  /**
   * Execute a command in Obsidian.
   * @param commandId - The ID of the command to execute
   */
  async executeCommand(commandId: string): Promise<void> {
    await this.request({
      method: "POST",
      path: `/commands/${encodeURIComponent(commandId)}/`,
    });
  }

  // ===========================================================================
  // VAULT DIRECTORY OPERATIONS
  // ===========================================================================

  /**
   * List files in the vault root or a specific directory.
   * @param path - Optional directory path (relative to vault root)
   */
  async listDirectory(path?: string): Promise<string[]> {
    const endpoint = path ? `/vault/${encodeURIPath(path)}/` : "/vault/";
    const response = await this.request<{ files: string[] }>({
      method: "GET",
      path: endpoint,
    });
    return response.data.files;
  }

  /**
   * List all files in the vault recursively.
   * @param basePath - Starting path for the listing
   * @param maxDepth - Maximum recursion depth (default: 10)
   */
  async listAllFiles(basePath: string = "", maxDepth: number = 10): Promise<VaultItem[]> {
    const items: VaultItem[] = [];
    await this.listFilesRecursive(basePath, items, 0, maxDepth);
    return items;
  }

  /**
   * Recursive helper for listing files.
   */
  private async listFilesRecursive(
    path: string,
    items: VaultItem[],
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;

    const entries = await this.listDirectory(path || undefined);

    for (const entry of entries) {
      const fullPath = path ? `${path}/${entry}` : entry;
      const isDirectory = entry.endsWith("/");
      const name = isDirectory ? entry.slice(0, -1) : entry;

      const item: VaultItem = {
        name,
        path: isDirectory ? fullPath.slice(0, -1) : fullPath,
        type: isDirectory ? "directory" : "file",
      };

      if (!isDirectory) {
        const lastDot = name.lastIndexOf(".");
        if (lastDot !== -1) {
          item.extension = name.slice(lastDot + 1);
        }
      }

      items.push(item);

      if (isDirectory) {
        await this.listFilesRecursive(item.path, items, currentDepth + 1, maxDepth);
      }
    }
  }

  // ===========================================================================
  // VAULT FILE OPERATIONS
  // ===========================================================================

  /**
   * Get the content of a file from the vault.
   * @param path - File path relative to vault root
   */
  async getFile(path: string): Promise<string> {
    const response = await this.request<string>({
      method: "GET",
      path: `/vault/${encodeURIPath(path)}`,
    });
    return response.data;
  }

  /**
   * Get a note with parsed frontmatter.
   * @param path - File path relative to vault root
   */
  async getNote(path: string): Promise<NoteContent> {
    const content = await this.getFile(path);
    const { frontmatter, body } = parseFrontmatter(content);

    return {
      content,
      path,
      frontmatter,
      body,
    };
  }

  /**
   * Create or replace a file in the vault.
   * @param path - File path relative to vault root
   * @param content - File content
   */
  async putFile(path: string, content: string): Promise<void> {
    await this.request({
      method: "PUT",
      path: `/vault/${encodeURIPath(path)}`,
      body: content,
      contentType: "text/markdown",
    });
  }

  /**
   * Create a note with frontmatter.
   * @param path - File path relative to vault root
   * @param content - Note content (without frontmatter)
   * @param frontmatter - Frontmatter properties
   */
  async createNote(
    path: string,
    content: string,
    frontmatter?: StandardFrontmatter
  ): Promise<void> {
    let fullContent = content;

    if (frontmatter && Object.keys(frontmatter).length > 0) {
      const frontmatterStr = stringifyFrontmatter(frontmatter);
      fullContent = `${frontmatterStr}\n${content}`;
    }

    await this.putFile(path, fullContent);
  }

  /**
   * Append content to a file.
   * @param path - File path relative to vault root
   * @param content - Content to append
   */
  async appendToFile(path: string, content: string): Promise<void> {
    await this.request({
      method: "POST",
      path: `/vault/${encodeURIPath(path)}`,
      body: content,
      contentType: "text/markdown",
    });
  }

  /**
   * Patch a file with specific operations.
   * @param path - File path relative to vault root
   * @param content - Content for the patch operation
   * @param options - Patch operation options
   */
  async patchFile(
    path: string,
    content: string,
    options: Partial<PatchOptions> = {}
  ): Promise<void> {
    const headers: Record<string, string> = {};

    if (options.operation) {
      headers["X-Operation"] = options.operation;
    }
    if (options.heading) {
      headers["X-Heading"] = options.heading;
    }
    if (options.targetText) {
      headers["X-Target-Text"] = options.targetText;
    }
    if (options.lineNumber !== undefined) {
      headers["X-Line-Number"] = String(options.lineNumber);
    }
    if (options.createIfNotExists) {
      headers["X-Create-If-Not-Exists"] = "true";
    }

    await this.request({
      method: "PATCH",
      path: `/vault/${encodeURIPath(path)}`,
      body: content,
      contentType: "text/markdown",
      headers,
    });
  }

  /**
   * Delete a file from the vault.
   * @param path - File path relative to vault root
   */
  async deleteFile(path: string): Promise<void> {
    await this.request({
      method: "DELETE",
      path: `/vault/${encodeURIPath(path)}`,
    });
  }

  // ===========================================================================
  // ACTIVE FILE OPERATIONS
  // ===========================================================================

  /**
   * Get the content of the currently active file in Obsidian.
   */
  async getActiveFile(): Promise<NoteContent | null> {
    try {
      const response = await this.request<string>({
        method: "GET",
        path: "/active/",
      });
      const content = response.data;
      const path = response.headers["x-filepath"] || "active";
      const { frontmatter, body } = parseFrontmatter(content);

      return {
        content,
        path,
        frontmatter,
        body,
      };
    } catch (error) {
      if (error instanceof ObsidianApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update the content of the currently active file.
   * @param content - New content for the file
   */
  async updateActiveFile(content: string): Promise<void> {
    await this.request({
      method: "PUT",
      path: "/active/",
      body: content,
      contentType: "text/markdown",
    });
  }

  /**
   * Append content to the currently active file.
   * @param content - Content to append
   */
  async appendToActiveFile(content: string): Promise<void> {
    await this.request({
      method: "POST",
      path: "/active/",
      body: content,
      contentType: "text/markdown",
    });
  }

  /**
   * Patch the currently active file.
   * @param content - Content for the patch operation
   * @param options - Patch options
   */
  async patchActiveFile(
    content: string,
    options: Partial<PatchOptions> = {}
  ): Promise<void> {
    const headers: Record<string, string> = {};

    if (options.operation) {
      headers["X-Operation"] = options.operation;
    }
    if (options.heading) {
      headers["X-Heading"] = options.heading;
    }
    if (options.targetText) {
      headers["X-Target-Text"] = options.targetText;
    }

    await this.request({
      method: "PATCH",
      path: "/active/",
      body: content,
      contentType: "text/markdown",
      headers,
    });
  }

  /**
   * Delete the currently active file.
   */
  async deleteActiveFile(): Promise<void> {
    await this.request({
      method: "DELETE",
      path: "/active/",
    });
  }

  // ===========================================================================
  // OPEN FILE OPERATIONS
  // ===========================================================================

  /**
   * Open a file in the Obsidian UI.
   * @param path - File path relative to vault root
   * @param newLeaf - Whether to open in a new pane
   */
  async openFile(path: string, newLeaf: boolean = false): Promise<void> {
    const queryParams = newLeaf ? "?newLeaf=true" : "";
    await this.request({
      method: "POST",
      path: `/open/${encodeURIPath(path)}${queryParams}`,
    });
  }

  // ===========================================================================
  // SEARCH OPERATIONS
  // ===========================================================================

  /**
   * Search the vault using Obsidian's query syntax.
   * @param query - Search query (supports Obsidian search syntax)
   */
  async search(query: string): Promise<SearchResult[]> {
    const response = await this.request<SearchResult[]>({
      method: "POST",
      path: "/search/",
      body: JSON.stringify({ query }),
      contentType: "application/json",
    });
    return response.data;
  }

  /**
   * Simple text search across the vault.
   * @param query - Plain text to search for
   */
  async simpleSearch(query: string): Promise<SearchResult[]> {
    const response = await this.request<SearchResult[]>({
      method: "POST",
      path: "/search/simple/",
      body: JSON.stringify({ query }),
      contentType: "application/json",
    });
    return response.data;
  }

  // ===========================================================================
  // PERIODIC NOTES OPERATIONS
  // ===========================================================================

  /**
   * Get the current periodic note for a given period.
   * @param period - The period type (daily, weekly, monthly, quarterly, yearly)
   */
  async getCurrentPeriodicNote(period: PeriodicNotePeriod): Promise<NoteContent | null> {
    try {
      const response = await this.request<string>({
        method: "GET",
        path: `/periodic/${period}/`,
      });
      const content = response.data;
      const path = response.headers["x-filepath"] || `${period}-note`;
      const { frontmatter, body } = parseFrontmatter(content);

      return {
        content,
        path,
        frontmatter,
        body,
      };
    } catch (error) {
      if (error instanceof ObsidianApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get a periodic note for a specific date.
   * @param period - The period type
   * @param date - The specific date
   */
  async getPeriodicNote(
    period: PeriodicNotePeriod,
    date: PeriodicNoteDate
  ): Promise<NoteContent | null> {
    try {
      const response = await this.request<string>({
        method: "GET",
        path: `/periodic/${period}/${date.year}/${date.month}/${date.day}/`,
      });
      const content = response.data;
      const path = response.headers["x-filepath"] || `${period}-note`;
      const { frontmatter, body } = parseFrontmatter(content);

      return {
        content,
        path,
        frontmatter,
        body,
      };
    } catch (error) {
      if (error instanceof ObsidianApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Append content to the current periodic note.
   * @param period - The period type
   * @param content - Content to append
   */
  async appendToPeriodicNote(period: PeriodicNotePeriod, content: string): Promise<void> {
    await this.request({
      method: "POST",
      path: `/periodic/${period}/`,
      body: content,
      contentType: "text/markdown",
    });
  }

  /**
   * Append content to a periodic note for a specific date.
   * @param period - The period type
   * @param date - The specific date
   * @param content - Content to append
   */
  async appendToPeriodicNoteByDate(
    period: PeriodicNotePeriod,
    date: PeriodicNoteDate,
    content: string
  ): Promise<void> {
    await this.request({
      method: "POST",
      path: `/periodic/${period}/${date.year}/${date.month}/${date.day}/`,
      body: content,
      contentType: "text/markdown",
    });
  }

  /**
   * Update the content of the current periodic note.
   * @param period - The period type
   * @param content - New content
   */
  async updatePeriodicNote(period: PeriodicNotePeriod, content: string): Promise<void> {
    await this.request({
      method: "PUT",
      path: `/periodic/${period}/`,
      body: content,
      contentType: "text/markdown",
    });
  }

  /**
   * Patch the current periodic note.
   * @param period - The period type
   * @param content - Patch content
   * @param options - Patch options
   */
  async patchPeriodicNote(
    period: PeriodicNotePeriod,
    content: string,
    options: Partial<PatchOptions> = {}
  ): Promise<void> {
    const headers: Record<string, string> = {};

    if (options.operation) {
      headers["X-Operation"] = options.operation;
    }
    if (options.heading) {
      headers["X-Heading"] = options.heading;
    }

    await this.request({
      method: "PATCH",
      path: `/periodic/${period}/`,
      body: content,
      contentType: "text/markdown",
      headers,
    });
  }

  /**
   * Delete the current periodic note.
   * @param period - The period type
   */
  async deletePeriodicNote(period: PeriodicNotePeriod): Promise<void> {
    await this.request({
      method: "DELETE",
      path: `/periodic/${period}/`,
    });
  }

  // ===========================================================================
  // PRIVATE HTTP METHODS
  // ===========================================================================

  /**
   * Make an HTTP request to the Obsidian API.
   */
  private async request<T>(options: RequestOptions): Promise<HttpResponse<T>> {
    return new Promise((resolve, reject) => {
      const url = new URL(options.path, this.baseUrl);
      const isHttps = this.config.secure;
      const httpModule = isHttps ? https : http;

      const requestOptions: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: "application/json, text/plain, */*",
          ...options.headers,
        },
        agent: this.agent,
        timeout: this.config.timeout,
      };

      if (options.body) {
        const bodyBuffer = Buffer.isBuffer(options.body)
          ? options.body
          : Buffer.from(options.body, "utf-8");
        requestOptions.headers = {
          ...requestOptions.headers,
          "Content-Type": options.contentType || "application/json",
          "Content-Length": bodyBuffer.length,
        };
      }

      const req = httpModule.request(requestOptions, (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => chunks.push(chunk));

        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          const headers: Record<string, string> = {};

          // Convert headers to a simple object
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === "string") {
              headers[key.toLowerCase()] = value;
            } else if (Array.isArray(value)) {
              headers[key.toLowerCase()] = value[0];
            }
          }

          const statusCode = res.statusCode || 500;

          if (statusCode >= 400) {
            let errorMessage = body;
            try {
              const parsed = JSON.parse(body);
              errorMessage = parsed.message || parsed.error || body;
            } catch {
              // Use body as-is
            }

            reject(
              new ObsidianApiError({
                code: `HTTP_${statusCode}`,
                message: errorMessage,
                status: statusCode,
              })
            );
            return;
          }

          // Parse response based on content type
          let data: T;
          const contentType = headers["content-type"] || "";

          if (contentType.includes("application/json")) {
            try {
              data = JSON.parse(body) as T;
            } catch {
              data = body as unknown as T;
            }
          } else {
            data = body as unknown as T;
          }

          resolve({
            status: statusCode,
            statusText: res.statusMessage || "",
            data,
            headers,
          });
        });
      });

      req.on("error", (error) => {
        reject(
          new ObsidianApiError({
            code: "NETWORK_ERROR",
            message: `Failed to connect to Obsidian: ${error.message}`,
            status: 0,
            details: { originalError: error.message },
          })
        );
      });

      req.on("timeout", () => {
        req.destroy();
        reject(
          new ObsidianApiError({
            code: "TIMEOUT",
            message: `Request timed out after ${this.config.timeout}ms`,
            status: 408,
          })
        );
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }
}

/**
 * Encode a file path for use in URLs.
 * Handles special characters while preserving path separators.
 */
function encodeURIPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

// Singleton instance for convenience
let clientInstance: ObsidianClient | null = null;

/**
 * Get or create the singleton Obsidian client instance.
 * @param config - Configuration (only used on first call)
 */
export function getClient(config: ObsidianConfig): ObsidianClient {
  if (!clientInstance) {
    clientInstance = new ObsidianClient(config);
  }
  return clientInstance;
}

/**
 * Create a new Obsidian client instance.
 * @param config - Configuration for the client
 */
export function createClient(config: ObsidianConfig): ObsidianClient {
  return new ObsidianClient(config);
}

/**
 * Reset the singleton client instance.
 * Useful for testing or reconnecting with different config.
 */
export function resetClient(): void {
  clientInstance = null;
}
