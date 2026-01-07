/**
 * ============================================================================
 * OBSIDIAN MCP - Type Definitions
 * ============================================================================
 *
 * Comprehensive TypeScript type definitions for the Obsidian Local REST API
 * and internal MCP server data structures.
 *
 * These types ensure type safety throughout the codebase and provide
 * excellent IDE support with autocompletion and error checking.
 * ============================================================================
 */

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for connecting to Obsidian's Local REST API.
 * These values can be set via environment variables.
 */
export interface ObsidianConfig {
  /** API key from Obsidian Local REST API plugin settings */
  apiKey: string;
  /** Host where Obsidian is running (default: 127.0.0.1) */
  host: string;
  /** Port for the REST API (default: 27124) */
  port: number;
  /** Whether to use HTTPS (default: true) */
  secure: boolean;
  /** Request timeout in milliseconds (default: 30000) */
  timeout: number;
  /** Whether to verify SSL certificates (default: false for self-signed) */
  verifySsl: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<ObsidianConfig, "apiKey"> = {
  host: "127.0.0.1",
  port: 27124,
  secure: true,
  timeout: 30000,
  verifySsl: false,
};

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Basic server status information returned by GET /
 */
export interface ServerStatus {
  status: string;
  versions: {
    obsidian: string;
    self: string;
  };
  service: string;
  authenticated: boolean;
}

/**
 * Represents a file or directory in the vault
 */
export interface VaultItem {
  /** File or directory name */
  name: string;
  /** Full path from vault root */
  path: string;
  /** Type of item */
  type: "file" | "directory";
  /** File extension (for files only) */
  extension?: string;
  /** File size in bytes (for files only) */
  size?: number;
  /** Creation timestamp */
  ctime?: number;
  /** Modification timestamp */
  mtime?: number;
}

/**
 * Directory listing response
 */
export interface DirectoryListing {
  files: string[];
}

/**
 * Note content with optional metadata
 */
export interface NoteContent {
  /** Raw markdown content */
  content: string;
  /** File path */
  path: string;
  /** Parsed frontmatter (if any) */
  frontmatter?: Record<string, unknown>;
  /** Content without frontmatter */
  body?: string;
}

/**
 * Search result from the vault
 */
export interface SearchResult {
  /** Path to the matching file */
  filename: string;
  /** Relevance score */
  score?: number;
  /** Matching content snippets */
  matches?: SearchMatch[];
}

/**
 * Individual search match within a file
 */
export interface SearchMatch {
  /** Match context/snippet */
  match: string;
  /** Position information */
  position?: {
    start: number;
    end: number;
  };
}

/**
 * Response from POST /search
 */
export interface SearchResponse {
  results: SearchResult[];
}

/**
 * Available command in Obsidian
 */
export interface ObsidianCommand {
  /** Unique command ID */
  id: string;
  /** Human-readable name */
  name: string;
}

/**
 * Commands list response
 */
export interface CommandsResponse {
  commands: ObsidianCommand[];
}

// =============================================================================
// Periodic Notes Types
// =============================================================================

/**
 * Supported periodic note periods
 */
export type PeriodicNotePeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

/**
 * Periodic note date specification
 */
export interface PeriodicNoteDate {
  year: number;
  month: number;
  day: number;
}

// =============================================================================
// Patch Operation Types
// =============================================================================

/**
 * Supported patch operations for note content
 */
export type PatchOperation =
  | "append"
  | "prepend"
  | "replace"
  | "insert-after"
  | "insert-before"
  | "insert-under-heading";

/**
 * Options for patching note content
 */
export interface PatchOptions {
  /** The operation to perform */
  operation: PatchOperation;
  /** Content to insert/append/prepend */
  content: string;
  /** Target heading (for heading-based operations) */
  heading?: string;
  /** Target text to find (for insert-before/after operations) */
  targetText?: string;
  /** Line number for line-based operations */
  lineNumber?: number;
  /** Whether to create the file if it doesn't exist */
  createIfNotExists?: boolean;
}

// =============================================================================
// Frontmatter Types
// =============================================================================

/**
 * Standard frontmatter properties
 */
export interface StandardFrontmatter {
  /** Note title */
  title?: string;
  /** Array of tags */
  tags?: string[];
  /** Aliases for the note */
  aliases?: string[];
  /** Creation date */
  created?: string;
  /** Last modified date */
  modified?: string;
  /** CSS classes to apply */
  cssclass?: string;
  /** Whether to publish the note */
  publish?: boolean;
  /** Custom properties */
  [key: string]: unknown;
}

// =============================================================================
// Link Types
// =============================================================================

/**
 * Represents a link between notes
 */
export interface NoteLink {
  /** Source file path */
  source: string;
  /** Target file path or link text */
  target: string;
  /** Display text of the link */
  displayText?: string;
  /** Whether this is an embed (![[link]]) */
  isEmbed?: boolean;
  /** Link type */
  type: "internal" | "external" | "tag";
}

/**
 * Backlink information
 */
export interface Backlink {
  /** Path of the file containing the backlink */
  sourcePath: string;
  /** Context around the link */
  context?: string;
  /** Line number where the link appears */
  lineNumber?: number;
}

// =============================================================================
// Template Types
// =============================================================================

/**
 * Template for creating new notes
 */
export interface NoteTemplate {
  /** Template name */
  name: string;
  /** Template content */
  content: string;
  /** Default frontmatter */
  frontmatter?: StandardFrontmatter;
  /** Folder to create the note in */
  folder?: string;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error response from the API
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Custom error class for Obsidian API errors
 */
export class ObsidianApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ObsidianApiError";
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

// =============================================================================
// Tool Response Types
// =============================================================================

/**
 * Standard success response structure
 */
export interface ToolSuccessResponse {
  success: true;
  message: string;
  data?: unknown;
}

/**
 * Standard error response structure
 */
export interface ToolErrorResponse {
  success: false;
  error: string;
  code?: string;
}

/**
 * Combined tool response type
 */
export type ToolResponse = ToolSuccessResponse | ToolErrorResponse;

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Options for listing vault contents
 */
export interface ListVaultOptions {
  /** Directory path to list (default: root) */
  path?: string;
  /** Whether to include subdirectories recursively */
  recursive?: boolean;
  /** File extensions to filter by */
  extensions?: string[];
  /** Maximum depth for recursive listing */
  maxDepth?: number;
}

/**
 * Options for creating a new note
 */
export interface CreateNoteOptions {
  /** File path for the note */
  path: string;
  /** Note content */
  content: string;
  /** Whether to overwrite if exists */
  overwrite?: boolean;
  /** Frontmatter to include */
  frontmatter?: StandardFrontmatter;
  /** Whether to create parent directories */
  createFolders?: boolean;
}

/**
 * Options for reading a note
 */
export interface ReadNoteOptions {
  /** File path */
  path: string;
  /** Whether to parse frontmatter */
  parseFrontmatter?: boolean;
  /** Whether to include file stats */
  includeStats?: boolean;
}

/**
 * Options for updating a note
 */
export interface UpdateNoteOptions {
  /** File path */
  path: string;
  /** New content (replaces entire file) */
  content?: string;
  /** Patch options for partial updates */
  patch?: PatchOptions;
}

/**
 * Options for searching the vault
 */
export interface SearchOptions {
  /** Search query */
  query: string;
  /** Folder to search in */
  folder?: string;
  /** File extensions to include */
  extensions?: string[];
  /** Maximum number of results */
  limit?: number;
  /** Whether to include content snippets */
  includeSnippets?: boolean;
}
