/**
 * ============================================================================
 * OBSIDIAN MCP - Frontmatter Utilities
 * ============================================================================
 *
 * Utilities for parsing and manipulating YAML frontmatter in markdown files.
 * Obsidian uses YAML frontmatter for note metadata.
 * ============================================================================
 */

import { StandardFrontmatter } from "../types/obsidian.js";

/**
 * Result of parsing frontmatter from a markdown file.
 */
export interface ParsedFrontmatter {
  /** Parsed frontmatter object */
  frontmatter: Record<string, unknown>;
  /** Content without frontmatter */
  body: string;
  /** Raw frontmatter string (including ---) */
  raw: string;
}

/**
 * Regular expression to match YAML frontmatter.
 * Matches content between --- delimiters at the start of a file.
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parse YAML frontmatter from markdown content.
 *
 * @param content - The full markdown content
 * @returns Parsed frontmatter and body content
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    return {
      frontmatter: {},
      body: content,
      raw: "",
    };
  }

  const raw = match[0];
  const yamlContent = match[1];
  const body = content.slice(raw.length);

  try {
    const frontmatter = parseYaml(yamlContent);
    return {
      frontmatter,
      body,
      raw,
    };
  } catch {
    // Return empty frontmatter if parsing fails
    return {
      frontmatter: {},
      body: content,
      raw: "",
    };
  }
}

/**
 * Convert a frontmatter object to YAML string with delimiters.
 *
 * @param frontmatter - The frontmatter object
 * @returns YAML string with --- delimiters
 */
export function stringifyFrontmatter(frontmatter: StandardFrontmatter): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return "";
  }

  const yamlContent = stringifyYaml(frontmatter);
  return `---\n${yamlContent}---\n`;
}

/**
 * Update frontmatter in a markdown file.
 *
 * @param content - Original markdown content
 * @param updates - Frontmatter fields to update
 * @returns Updated markdown content
 */
export function updateFrontmatter(
  content: string,
  updates: Partial<StandardFrontmatter>
): string {
  const { frontmatter, body } = parseFrontmatter(content);
  const updatedFrontmatter = { ...frontmatter, ...updates };
  const newFrontmatter = stringifyFrontmatter(updatedFrontmatter as StandardFrontmatter);

  return newFrontmatter + body;
}

/**
 * Remove frontmatter from markdown content.
 *
 * @param content - Markdown content with frontmatter
 * @returns Content without frontmatter
 */
export function removeFrontmatter(content: string): string {
  return parseFrontmatter(content).body;
}

/**
 * Extract a specific frontmatter field.
 *
 * @param content - Markdown content
 * @param field - Field name to extract
 * @returns The field value or undefined
 */
export function getFrontmatterField<T = unknown>(
  content: string,
  field: string
): T | undefined {
  const { frontmatter } = parseFrontmatter(content);
  return frontmatter[field] as T | undefined;
}

/**
 * Add tags to a note's frontmatter.
 *
 * @param content - Markdown content
 * @param tags - Tags to add
 * @returns Updated content
 */
export function addTags(content: string, tags: string[]): string {
  const { frontmatter, body } = parseFrontmatter(content);
  const existingTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

  // Normalize tags (remove # prefix if present)
  const normalizedTags = tags.map((tag) => (tag.startsWith("#") ? tag.slice(1) : tag));

  // Merge and deduplicate tags
  const allTags = [...new Set([...existingTags, ...normalizedTags])];

  const updatedFrontmatter = { ...frontmatter, tags: allTags };
  return stringifyFrontmatter(updatedFrontmatter as StandardFrontmatter) + body;
}

/**
 * Remove tags from a note's frontmatter.
 *
 * @param content - Markdown content
 * @param tags - Tags to remove
 * @returns Updated content
 */
export function removeTags(content: string, tags: string[]): string {
  const { frontmatter, body } = parseFrontmatter(content);

  if (!Array.isArray(frontmatter.tags)) {
    return content;
  }

  // Normalize tags for comparison
  const tagsToRemove = new Set(
    tags.map((tag) => (tag.startsWith("#") ? tag.slice(1) : tag).toLowerCase())
  );

  const filteredTags = frontmatter.tags.filter(
    (tag: string) => !tagsToRemove.has(tag.toLowerCase())
  );

  const updatedFrontmatter = { ...frontmatter, tags: filteredTags };
  return stringifyFrontmatter(updatedFrontmatter as StandardFrontmatter) + body;
}

/**
 * Get all tags from a note (frontmatter + inline).
 *
 * @param content - Markdown content
 * @returns Array of unique tags
 */
export function getAllTags(content: string): string[] {
  const { frontmatter, body } = parseFrontmatter(content);
  const tags = new Set<string>();

  // Get tags from frontmatter
  if (Array.isArray(frontmatter.tags)) {
    frontmatter.tags.forEach((tag: string) => tags.add(tag));
  }

  // Find inline tags (#tag format)
  const inlineTagRegex = /#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
  let match;
  while ((match = inlineTagRegex.exec(body)) !== null) {
    tags.add(match[1]);
  }

  return Array.from(tags);
}

/**
 * Add aliases to a note's frontmatter.
 *
 * @param content - Markdown content
 * @param aliases - Aliases to add
 * @returns Updated content
 */
export function addAliases(content: string, aliases: string[]): string {
  const { frontmatter, body } = parseFrontmatter(content);
  const existingAliases = Array.isArray(frontmatter.aliases) ? frontmatter.aliases : [];

  // Merge and deduplicate aliases
  const allAliases = [...new Set([...existingAliases, ...aliases])];

  const updatedFrontmatter = { ...frontmatter, aliases: allAliases };
  return stringifyFrontmatter(updatedFrontmatter as StandardFrontmatter) + body;
}

// =============================================================================
// Simple YAML Parser/Stringifier
// =============================================================================
// We implement a simple YAML parser to avoid external dependencies.
// This handles the common frontmatter use cases in Obsidian.
// =============================================================================

/**
 * Parse a simple YAML string into an object.
 * Handles common frontmatter patterns: strings, numbers, booleans, arrays, simple objects.
 */
function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);

  let currentKey = "";
  let currentArray: string[] | null = null;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Check for array item
    if (line.match(/^\s*-\s+/)) {
      if (currentArray !== null) {
        const value = line.replace(/^\s*-\s+/, "").trim();
        currentArray.push(parseYamlValue(value) as string);
      }
      continue;
    }

    // Check for key-value pair
    const keyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)?$/);
    if (keyMatch) {
      // Save previous array if any
      if (currentArray !== null && currentKey) {
        result[currentKey] = currentArray;
        currentArray = null;
      }

      currentKey = keyMatch[1];
      const valueStr = keyMatch[2]?.trim();

      if (!valueStr) {
        // Empty value might indicate start of array or nested object
        currentArray = [];
      } else {
        result[currentKey] = parseYamlValue(valueStr);
        currentArray = null;
      }
    }
  }

  // Save final array if any
  if (currentArray !== null && currentKey) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Parse a single YAML value.
 */
function parseYamlValue(value: string): unknown {
  // Handle quoted strings
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Handle booleans
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Handle null
  if (value.toLowerCase() === "null" || value === "~") return null;

  // Handle numbers
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

  // Handle inline arrays [item1, item2]
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1);
    if (!inner.trim()) return [];
    return inner.split(",").map((item) => parseYamlValue(item.trim()));
  }

  // Return as string
  return value;
}

/**
 * Convert an object to YAML string.
 */
function stringifyYaml(obj: Record<string, unknown>, indent: number = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${prefix}${key}: []`);
      } else {
        lines.push(`${prefix}${key}:`);
        for (const item of value) {
          lines.push(`${prefix}  - ${stringifyYamlValue(item)}`);
        }
      }
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${prefix}${key}:`);
      lines.push(stringifyYaml(value as Record<string, unknown>, indent + 1));
    } else {
      lines.push(`${prefix}${key}: ${stringifyYamlValue(value)}`);
    }
  }

  return lines.join("\n") + (indent === 0 ? "\n" : "");
}

/**
 * Convert a single value to YAML string.
 */
function stringifyYamlValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    // Quote strings that need it
    if (
      value.includes(":") ||
      value.includes("#") ||
      value.includes("\n") ||
      value.startsWith(" ") ||
      value.endsWith(" ") ||
      /^[\[\]{}>|*&!%@`]/.test(value)
    ) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}
