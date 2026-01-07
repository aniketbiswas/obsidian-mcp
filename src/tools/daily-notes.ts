/**
 * ============================================================================
 * OBSIDIAN MCP - Daily/Periodic Notes Tools
 * ============================================================================
 *
 * Tools for working with daily notes, weekly notes, and other periodic notes.
 * Requires the Periodic Notes plugin or Daily Notes core plugin in Obsidian.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObsidianClient } from "../utils/client.js";
import { ObsidianApiError, PeriodicNotePeriod } from "../types/obsidian.js";
import { formatDate, getSummary } from "../utils/markdown.js";

/**
 * Register daily/periodic notes tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client
 */
export function registerDailyNotesTools(
  server: McpServer,
  client: ObsidianClient
): void {
  // ---------------------------------------------------------------------------
  // TOOL: get_daily_note
  // ---------------------------------------------------------------------------
  // Get today's daily note.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_daily_note",
    "Get the content of today's daily note. " +
      "Creates the note if it doesn't exist (using Obsidian's daily notes settings). " +
      "Requires Daily Notes core plugin or Periodic Notes plugin.",
    {
      includeContent: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include the full content."),
    },
    async ({ includeContent }) => {
      try {
        const note = await client.getCurrentPeriodicNote("daily");

        if (!note) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    exists: false,
                    message:
                      "No daily note for today. Daily Notes plugin may not be configured.",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const response: Record<string, unknown> = {
          success: true,
          exists: true,
          path: note.path,
          date: formatDate(new Date()),
        };

        if (note.frontmatter && Object.keys(note.frontmatter).length > 0) {
          response.frontmatter = note.frontmatter;
        }

        if (includeContent) {
          response.content = note.content;
        } else {
          response.summary = getSummary(note.content, 200);
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
              text: `Error getting daily note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: append_to_daily_note
  // ---------------------------------------------------------------------------
  // Append content to today's daily note.
  // ---------------------------------------------------------------------------

  server.tool(
    "append_to_daily_note",
    "Append content to today's daily note. " +
      "Creates the daily note if it doesn't exist.",
    {
      content: z.string().describe("Content to append."),
      heading: z
        .string()
        .optional()
        .describe("Optional heading to append under."),
      addTimestamp: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to add a timestamp before the content."),
    },
    async ({ content, heading, addTimestamp }) => {
      try {
        let formattedContent = content;

        if (addTimestamp) {
          const time = new Date().toLocaleTimeString();
          formattedContent = `[${time}] ${content}`;
        }

        if (heading) {
          await client.patchPeriodicNote("daily", formattedContent, {
            operation: "insert-under-heading",
            heading,
          });
        } else {
          await client.appendToPeriodicNote("daily", `\n${formattedContent}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Content appended to daily note",
                  date: formatDate(new Date()),
                  heading: heading || null,
                  addedTimestamp: addTimestamp,
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
              text: `Error appending to daily note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: get_periodic_note
  // ---------------------------------------------------------------------------
  // Get a periodic note for a specific period and date.
  // ---------------------------------------------------------------------------

  server.tool(
    "get_periodic_note",
    "Get a periodic note for a specific period and date. " +
      "Supports daily, weekly, monthly, quarterly, and yearly notes. " +
      "Requires the Periodic Notes plugin for non-daily periods.",
    {
      period: z
        .enum(["daily", "weekly", "monthly", "quarterly", "yearly"])
        .describe("The period type."),
      year: z.number().int().optional().describe("Year (e.g., 2024). Defaults to current year."),
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe("Month (1-12). Defaults to current month."),
      day: z
        .number()
        .int()
        .min(1)
        .max(31)
        .optional()
        .describe("Day of month. Defaults to current day."),
    },
    async ({ period, year, month, day }) => {
      try {
        const now = new Date();
        const date = {
          year: year || now.getFullYear(),
          month: month || now.getMonth() + 1,
          day: day || now.getDate(),
        };

        let note;
        if (year || month || day) {
          // Specific date
          note = await client.getPeriodicNote(period as PeriodicNotePeriod, date);
        } else {
          // Current period
          note = await client.getCurrentPeriodicNote(period as PeriodicNotePeriod);
        }

        if (!note) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    exists: false,
                    period,
                    date,
                    message: `No ${period} note found for this date.`,
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
                  exists: true,
                  period,
                  date,
                  path: note.path,
                  frontmatter: note.frontmatter,
                  content: note.content,
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
              text: `Error getting periodic note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: append_to_periodic_note
  // ---------------------------------------------------------------------------
  // Append content to a periodic note.
  // ---------------------------------------------------------------------------

  server.tool(
    "append_to_periodic_note",
    "Append content to a periodic note. " +
      "Can append to current period's note or a specific date.",
    {
      period: z
        .enum(["daily", "weekly", "monthly", "quarterly", "yearly"])
        .describe("The period type."),
      content: z.string().describe("Content to append."),
      year: z.number().int().optional().describe("Year (defaults to current)."),
      month: z.number().int().min(1).max(12).optional().describe("Month (defaults to current)."),
      day: z.number().int().min(1).max(31).optional().describe("Day (defaults to current)."),
    },
    async ({ period, content, year, month, day }) => {
      try {
        const now = new Date();

        if (year || month || day) {
          const date = {
            year: year || now.getFullYear(),
            month: month || now.getMonth() + 1,
            day: day || now.getDate(),
          };
          await client.appendToPeriodicNoteByDate(
            period as PeriodicNotePeriod,
            date,
            `\n${content}`
          );
        } else {
          await client.appendToPeriodicNote(
            period as PeriodicNotePeriod,
            `\n${content}`
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Content appended to ${period} note`,
                  period,
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
              text: `Error appending to periodic note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: daily_journal_entry
  // ---------------------------------------------------------------------------
  // Add a structured journal entry to today's daily note.
  // ---------------------------------------------------------------------------

  server.tool(
    "daily_journal_entry",
    "Add a structured journal entry to today's daily note. " +
      "Creates a nicely formatted journal entry with optional sections.",
    {
      entry: z.string().describe("Main journal entry content."),
      mood: z
        .enum(["great", "good", "okay", "bad", "terrible"])
        .optional()
        .describe("Optional mood indicator."),
      highlights: z
        .array(z.string())
        .optional()
        .describe("Optional list of highlights/wins for the day."),
      gratitude: z
        .array(z.string())
        .optional()
        .describe("Optional gratitude items."),
      todos: z
        .array(z.string())
        .optional()
        .describe("Optional todo items to add."),
    },
    async ({ entry, mood, highlights, gratitude, todos }) => {
      try {
        const time = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Build journal entry
        const lines: string[] = [];

        // Header with time
        lines.push(`\n## 📝 Journal Entry - ${time}`);
        lines.push("");

        // Mood indicator
        if (mood) {
          const moodEmojis: Record<string, string> = {
            great: "😄 Great",
            good: "🙂 Good",
            okay: "😐 Okay",
            bad: "😔 Bad",
            terrible: "😢 Terrible",
          };
          lines.push(`**Mood:** ${moodEmojis[mood]}`);
          lines.push("");
        }

        // Main entry
        lines.push(entry);
        lines.push("");

        // Highlights
        if (highlights && highlights.length > 0) {
          lines.push("### ✨ Highlights");
          for (const highlight of highlights) {
            lines.push(`- ${highlight}`);
          }
          lines.push("");
        }

        // Gratitude
        if (gratitude && gratitude.length > 0) {
          lines.push("### 🙏 Gratitude");
          for (const item of gratitude) {
            lines.push(`- ${item}`);
          }
          lines.push("");
        }

        // Todos
        if (todos && todos.length > 0) {
          lines.push("### ✅ Tasks");
          for (const todo of todos) {
            lines.push(`- [ ] ${todo}`);
          }
          lines.push("");
        }

        const journalContent = lines.join("\n");

        await client.appendToPeriodicNote("daily", journalContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Journal entry added to daily note",
                  date: formatDate(new Date()),
                  time,
                  sections: {
                    hasMood: !!mood,
                    hasHighlights: !!(highlights && highlights.length > 0),
                    hasGratitude: !!(gratitude && gratitude.length > 0),
                    hasTodos: !!(todos && todos.length > 0),
                  },
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
              text: `Error adding journal entry: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: daily_standup
  // ---------------------------------------------------------------------------
  // Add a standup/scrum note to the daily note.
  // ---------------------------------------------------------------------------

  server.tool(
    "daily_standup",
    "Add a daily standup/scrum entry to today's daily note. " +
      "Uses the classic standup format: yesterday, today, blockers.",
    {
      yesterday: z.array(z.string()).describe("What you accomplished yesterday."),
      today: z.array(z.string()).describe("What you plan to do today."),
      blockers: z
        .array(z.string())
        .optional()
        .describe("Any blockers or impediments."),
    },
    async ({ yesterday, today, blockers }) => {
      try {
        const lines: string[] = [];

        lines.push("\n## 📋 Daily Standup");
        lines.push("");

        lines.push("### Yesterday");
        for (const item of yesterday) {
          lines.push(`- ${item}`);
        }
        lines.push("");

        lines.push("### Today");
        for (const item of today) {
          lines.push(`- ${item}`);
        }
        lines.push("");

        if (blockers && blockers.length > 0) {
          lines.push("### Blockers 🚧");
          for (const blocker of blockers) {
            lines.push(`- ${blocker}`);
          }
          lines.push("");
        }

        const standupContent = lines.join("\n");

        await client.appendToPeriodicNote("daily", standupContent);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Standup added to daily note",
                  date: formatDate(new Date()),
                  items: {
                    yesterday: yesterday.length,
                    today: today.length,
                    blockers: blockers?.length || 0,
                  },
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
              text: `Error adding standup: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
