/**
 * ============================================================================
 * OBSIDIAN MCP - Prompts
 * ============================================================================
 *
 * Pre-built prompt templates for common Obsidian workflows.
 * These help users quickly perform complex operations with their vault.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register Obsidian prompts with the MCP server.
 *
 * @param server - The MCP server instance
 */
export function registerObsidianPrompts(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // PROMPT: summarize-note
  // ---------------------------------------------------------------------------
  // Summarize the content of a note.
  // ---------------------------------------------------------------------------

  server.prompt(
    "summarize-note",
    "Generate a summary of an Obsidian note",
    {
      notePath: z.string().describe("Path to the note to summarize"),
      format: z
        .enum(["brief", "detailed", "bullet-points"])
        .optional()
        .default("brief")
        .describe("Summary format"),
    },
    async ({ notePath, format }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please read the note at "${notePath}" using the read_note tool, then provide a ${format} summary.

${format === "brief" ? "Keep the summary to 2-3 sentences capturing the main points." : ""}
${format === "detailed" ? "Provide a comprehensive summary covering all major topics and key details." : ""}
${format === "bullet-points" ? "Format the summary as bullet points, one for each key concept or section." : ""}

After summarizing, suggest 2-3 related topics or notes that might be worth linking to.`,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: organize-vault
  // ---------------------------------------------------------------------------
  // Analyze and suggest vault organization improvements.
  // ---------------------------------------------------------------------------

  server.prompt(
    "organize-vault",
    "Analyze vault structure and suggest organization improvements",
    {
      folder: z
        .string()
        .optional()
        .describe("Specific folder to analyze, or leave empty for entire vault"),
    },
    async ({ folder }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze my Obsidian vault ${folder ? `(specifically the "${folder}" folder)` : ""} and suggest organization improvements.

1. First, use list_all_files to see the structure
2. Use get_all_tags_in_vault to understand the tag taxonomy
3. Use find_orphan_notes to find unlinked notes

Then provide:
- An overview of the current organization
- Suggestions for folder restructuring if needed
- Tag consolidation recommendations
- Notes that could benefit from better linking
- Any other organization improvements`,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: daily-review
  // ---------------------------------------------------------------------------
  // Review and summarize today's activities.
  // ---------------------------------------------------------------------------

  server.prompt(
    "daily-review",
    "Generate a daily review based on today's notes and activities",
    {},
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me with my daily review:

1. Use get_daily_note to fetch today's daily note
2. Review any content I've added today
3. Identify:
   - Tasks completed (checked items)
   - Tasks still pending
   - Key notes or ideas captured
   - Links to other notes made

Then provide:
- A brief summary of my day's activities
- Suggestions for tomorrow's priorities
- Any thoughts or patterns you notice`,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: weekly-review
  // ---------------------------------------------------------------------------
  // Weekly review prompt.
  // ---------------------------------------------------------------------------

  server.prompt(
    "weekly-review",
    "Generate a weekly review and planning session",
    {},
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me with my weekly review:

1. Use get_periodic_note with period "weekly" to get this week's note if it exists
2. Search for notes created or modified this week using search_notes

Review and summarize:
- Key accomplishments this week
- Projects worked on
- Ideas captured
- Meetings and interactions

Then help me plan:
- Priorities for next week
- Follow-ups needed
- Notes that need attention or further development`,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: research-topic
  // ---------------------------------------------------------------------------
  // Research a topic across the vault.
  // ---------------------------------------------------------------------------

  server.prompt(
    "research-topic",
    "Research a topic by searching across your vault",
    {
      topic: z.string().describe("The topic to research"),
    },
    async ({ topic }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please research "${topic}" across my Obsidian vault:

1. Use search_with_context to find all relevant notes
2. For the most relevant results, use read_note to get full content
3. Use get_backlinks and get_outgoing_links to understand connections

Provide:
- A synthesis of what I've written about this topic
- Key insights from across my notes
- Connections between different notes on this topic
- Gaps in my knowledge or notes that could be expanded
- Suggestions for new notes or links to create`,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: create-moc
  // ---------------------------------------------------------------------------
  // Create a Map of Content note.
  // ---------------------------------------------------------------------------

  server.prompt(
    "create-moc",
    "Create a Map of Content (MOC) for a topic",
    {
      topic: z.string().describe("The topic for the MOC"),
      folder: z
        .string()
        .optional()
        .describe("Folder to search in"),
    },
    async ({ topic, folder }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me create a Map of Content (MOC) for "${topic}":

1. Search for related notes using search_with_context
${folder ? `2. Focus on the "${folder}" folder` : "2. Search the entire vault"}
3. Analyze the structure and relationships between notes

Create an MOC note that:
- Has a clear introduction explaining the topic
- Organizes related notes into logical categories/sections
- Uses [[wikilinks]] to link to all relevant notes
- Includes brief descriptions of each linked note
- Suggests gaps or areas that need more notes

Use create_note to save the MOC when ready.`,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: process-inbox
  // ---------------------------------------------------------------------------
  // Process inbox/capture notes.
  // ---------------------------------------------------------------------------

  server.prompt(
    "process-inbox",
    "Process captured notes from inbox and file them appropriately",
    {
      inboxPath: z
        .string()
        .optional()
        .default("Inbox.md")
        .describe("Path to your inbox note"),
    },
    async ({ inboxPath }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me process my inbox at "${inboxPath}":

1. Read the inbox using read_note
2. For each item in the inbox:
   - Determine if it should become its own note
   - Identify which folder it belongs in
   - Suggest tags and links
   - Identify if it relates to existing notes

Provide a processing plan:
- Items to expand into full notes (with suggested titles and locations)
- Items to append to existing notes (with target notes)
- Items to add to projects or tasks
- Items that can be archived or deleted

Then help me execute the plan using the appropriate tools.`,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: link-suggestions
  // ---------------------------------------------------------------------------
  // Suggest links for a note.
  // ---------------------------------------------------------------------------

  server.prompt(
    "link-suggestions",
    "Suggest links to add to a note based on its content",
    {
      notePath: z.string().describe("Path to the note to analyze"),
    },
    async ({ notePath }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze "${notePath}" and suggest links to add:

1. Read the note using read_note
2. Identify key concepts, people, projects, or terms mentioned
3. Search for existing notes that could be linked
4. Check current outgoing links to avoid duplicates

Provide:
- Specific text in the note that should be linked
- The notes to link to
- New notes that should be created and linked

After approval, help add the links using add_link_to_note or by updating the note content.`,
          },
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // PROMPT: meeting-prep
  // ---------------------------------------------------------------------------
  // Prepare for a meeting.
  // ---------------------------------------------------------------------------

  server.prompt(
    "meeting-prep",
    "Prepare for an upcoming meeting by gathering relevant notes",
    {
      meetingTopic: z.string().describe("Topic or subject of the meeting"),
      attendees: z
        .string()
        .optional()
        .describe("Names of attendees (comma-separated)"),
    },
    async ({ meetingTopic, attendees }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me prepare for a meeting about "${meetingTopic}"${attendees ? ` with ${attendees}` : ""}:

1. Search for notes related to the topic
2. ${attendees ? `Search for notes about the attendees` : ""}
3. Find any previous meeting notes on this topic
4. Look for relevant projects or tasks

Compile:
- Key background information I should review
- Open questions or items to discuss
- Relevant past decisions or discussions
- Talking points and agenda suggestions

Optionally, create a meeting note using create_meeting_note with the prepared agenda.`,
          },
        },
      ],
    })
  );

  console.error("✅ Obsidian prompts registered");
}
