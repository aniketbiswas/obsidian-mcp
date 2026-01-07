/**
 * ============================================================================
 * OBSIDIAN MCP - Markdown Utilities
 * ============================================================================
 *
 * Utilities for parsing and manipulating markdown content,
 * extracting links, headings, and other structural elements.
 * ============================================================================
 */

import { NoteLink } from "../types/obsidian.js";

/**
 * Represents a heading in markdown content.
 */
export interface MarkdownHeading {
  /** Heading level (1-6) */
  level: number;
  /** Heading text */
  text: string;
  /** Line number (1-indexed) */
  lineNumber: number;
  /** Full line including # symbols */
  raw: string;
}

/**
 * Extract all headings from markdown content.
 *
 * @param content - Markdown content
 * @returns Array of headings with their levels and positions
 */
export function extractHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        lineNumber: i + 1,
        raw: line,
      });
    }
  }

  return headings;
}

/**
 * Extract the content under a specific heading.
 *
 * @param content - Markdown content
 * @param headingText - The heading text to find
 * @returns Content under the heading (until next same-level or higher heading)
 */
export function getContentUnderHeading(
  content: string,
  headingText: string
): string | null {
  const headings = extractHeadings(content);
  const lines = content.split(/\r?\n/);

  // Find the target heading
  const targetHeading = headings.find(
    (h) => h.text.toLowerCase() === headingText.toLowerCase()
  );

  if (!targetHeading) {
    return null;
  }

  // Find the end of this section (next heading of same or higher level)
  const startLine = targetHeading.lineNumber;
  const nextHeading = headings.find(
    (h) => h.lineNumber > startLine && h.level <= targetHeading.level
  );

  const endLine = nextHeading ? nextHeading.lineNumber - 1 : lines.length;

  // Extract content (skip the heading line itself)
  const sectionLines = lines.slice(startLine, endLine);

  return sectionLines.join("\n").trim();
}

/**
 * Extract all internal links ([[link]]) from markdown content.
 *
 * @param content - Markdown content
 * @returns Array of internal links
 */
export function extractInternalLinks(content: string): NoteLink[] {
  const links: NoteLink[] = [];

  // Match [[link]] and ![[embed]] patterns
  // Handles: [[note]], [[note|display]], [[note#heading]], [[note#heading|display]]
  const linkRegex = /(!?)\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const isEmbed = match[1] === "!";
    const target = match[2].trim();
    const heading = match[3]?.trim();
    const displayText = match[4]?.trim();

    links.push({
      source: "", // Will be filled by caller
      target: heading ? `${target}#${heading}` : target,
      displayText: displayText || target,
      isEmbed,
      type: "internal",
    });
  }

  return links;
}

/**
 * Extract all external links from markdown content.
 *
 * @param content - Markdown content
 * @returns Array of external links
 */
export function extractExternalLinks(content: string): NoteLink[] {
  const links: NoteLink[] = [];

  // Match [text](url) pattern
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const displayText = match[1];
    const url = match[2];

    // Skip internal links that might use this format
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      continue;
    }

    links.push({
      source: "",
      target: url,
      displayText,
      isEmbed: false,
      type: "external",
    });
  }

  return links;
}

/**
 * Extract all tag references from markdown content.
 *
 * @param content - Markdown content
 * @returns Array of tag links
 */
export function extractTagLinks(content: string): NoteLink[] {
  const tags: NoteLink[] = [];

  // Match #tag pattern (not inside code blocks or links)
  // Tags can contain letters, numbers, underscores, hyphens, and forward slashes
  const tagRegex = /(?:^|[^\w])#([a-zA-Z][a-zA-Z0-9_/-]*)/g;

  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push({
      source: "",
      target: match[1],
      displayText: `#${match[1]}`,
      isEmbed: false,
      type: "tag",
    });
  }

  return tags;
}

/**
 * Extract all links (internal, external, tags) from markdown content.
 *
 * @param content - Markdown content
 * @param sourcePath - Path of the source file
 * @returns Array of all links
 */
export function extractAllLinks(content: string, sourcePath: string): NoteLink[] {
  const internal = extractInternalLinks(content).map((l) => ({
    ...l,
    source: sourcePath,
  }));

  const external = extractExternalLinks(content).map((l) => ({
    ...l,
    source: sourcePath,
  }));

  const tags = extractTagLinks(content).map((l) => ({
    ...l,
    source: sourcePath,
  }));

  return [...internal, ...external, ...tags];
}

/**
 * Insert content under a specific heading.
 *
 * @param content - Original markdown content
 * @param headingText - Heading to insert under
 * @param newContent - Content to insert
 * @param position - 'start' or 'end' of the section
 * @returns Updated content
 */
export function insertUnderHeading(
  content: string,
  headingText: string,
  newContent: string,
  position: "start" | "end" = "end"
): string {
  const headings = extractHeadings(content);
  const lines = content.split(/\r?\n/);

  // Find the target heading
  const targetHeading = headings.find(
    (h) => h.text.toLowerCase() === headingText.toLowerCase()
  );

  if (!targetHeading) {
    // Heading not found, append at end
    return content + "\n\n" + newContent;
  }

  const startLine = targetHeading.lineNumber;

  // Find the end of this section
  const nextHeading = headings.find(
    (h) => h.lineNumber > startLine && h.level <= targetHeading.level
  );

  const endLine = nextHeading ? nextHeading.lineNumber - 1 : lines.length;

  if (position === "start") {
    // Insert right after the heading
    lines.splice(startLine, 0, "", newContent);
  } else {
    // Insert before the next section
    lines.splice(endLine, 0, newContent, "");
  }

  return lines.join("\n");
}

/**
 * Insert content after a specific line containing text.
 *
 * @param content - Original markdown content
 * @param targetText - Text to search for
 * @param newContent - Content to insert
 * @returns Updated content
 */
export function insertAfterText(
  content: string,
  targetText: string,
  newContent: string
): string {
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(targetText)) {
      lines.splice(i + 1, 0, newContent);
      return lines.join("\n");
    }
  }

  // Target not found, append at end
  return content + "\n\n" + newContent;
}

/**
 * Insert content before a specific line containing text.
 *
 * @param content - Original markdown content
 * @param targetText - Text to search for
 * @param newContent - Content to insert
 * @returns Updated content
 */
export function insertBeforeText(
  content: string,
  targetText: string,
  newContent: string
): string {
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(targetText)) {
      lines.splice(i, 0, newContent);
      return lines.join("\n");
    }
  }

  // Target not found, prepend at start
  return newContent + "\n\n" + content;
}

/**
 * Get a summary/excerpt from markdown content.
 *
 * @param content - Markdown content
 * @param maxLength - Maximum length of the summary
 * @returns Summary text
 */
export function getSummary(content: string, maxLength: number = 200): string {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "");

  // Remove headings
  const withoutHeadings = withoutFrontmatter.replace(/^#+\s+.+$/gm, "");

  // Remove links but keep text
  const withoutLinks = withoutHeadings
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove images
  const withoutImages = withoutLinks.replace(/!\[[^\]]*\]\([^)]+\)/g, "");

  // Remove code blocks
  const withoutCodeBlocks = withoutImages.replace(/```[\s\S]*?```/g, "");

  // Remove inline code
  const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]+`/g, "");

  // Collapse whitespace and trim
  const cleaned = withoutInlineCode.replace(/\s+/g, " ").trim();

  // Truncate if needed
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Try to break at a word boundary
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
}

/**
 * Count words in markdown content (excluding frontmatter and code).
 *
 * @param content - Markdown content
 * @returns Word count
 */
export function countWords(content: string): number {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "");

  // Remove code blocks
  const withoutCodeBlocks = withoutFrontmatter.replace(/```[\s\S]*?```/g, "");

  // Remove inline code
  const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]+`/g, "");

  // Remove markdown syntax
  const plainText = withoutInlineCode
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~`]/g, "");

  // Count words
  const words = plainText.split(/\s+/).filter((word) => word.length > 0);

  return words.length;
}

/**
 * Create a wikilink from a path.
 *
 * @param path - File path
 * @param displayText - Optional display text
 * @returns Wikilink string
 */
export function createWikilink(path: string, displayText?: string): string {
  // Remove .md extension if present
  const linkPath = path.replace(/\.md$/, "");

  if (displayText && displayText !== linkPath) {
    return `[[${linkPath}|${displayText}]]`;
  }

  return `[[${linkPath}]]`;
}

/**
 * Create an embed link from a path.
 *
 * @param path - File path
 * @returns Embed string
 */
export function createEmbed(path: string): string {
  return `![[${path}]]`;
}

/**
 * Format a date for use in notes.
 *
 * @param date - Date object
 * @param format - Format string (simple tokens: YYYY, MM, DD, HH, mm, ss)
 * @returns Formatted date string
 */
export function formatDate(date: Date, format: string = "YYYY-MM-DD"): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return format
    .replace("YYYY", year)
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}
