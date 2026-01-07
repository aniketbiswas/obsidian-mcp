/**
 * ============================================================================
 * OBSIDIAN MCP - Template Tools
 * ============================================================================
 *
 * Tools for working with note templates and creating structured notes.
 * ============================================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObsidianClient } from "../utils/client.js";
import { ObsidianApiError, StandardFrontmatter } from "../types/obsidian.js";
import { formatDate } from "../utils/markdown.js";

/**
 * Register template tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param client - The Obsidian API client
 */
export function registerTemplateTools(server: McpServer, client: ObsidianClient): void {
  // ---------------------------------------------------------------------------
  // TOOL: create_note_from_template
  // ---------------------------------------------------------------------------
  // Create a note using a built-in template.
  // ---------------------------------------------------------------------------

  server.tool(
    "create_note_from_template",
    "Create a new note using a built-in template. " +
      "Available templates: meeting, project, book, article, person, recipe, decision.",
    {
      template: z
        .enum(["meeting", "project", "book", "article", "person", "recipe", "decision"])
        .describe("Template to use."),
      title: z.string().describe("Title for the new note."),
      folder: z.string().optional().describe("Folder to create the note in."),
      customFields: z
        .record(z.string())
        .optional()
        .describe("Custom fields to include in frontmatter."),
    },
    async ({ template, title, folder, customFields }) => {
      try {
        const templates = getTemplates();
        const selectedTemplate = templates[template];

        if (!selectedTemplate) {
          return {
            content: [
              {
                type: "text",
                text: `Template "${template}" not found.`,
              },
            ],
            isError: true,
          };
        }

        // Generate filename
        const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, "-");
        const filePath = folder
          ? `${folder}/${sanitizedTitle}.md`
          : `${sanitizedTitle}.md`;

        // Build frontmatter
        const now = new Date();
        const frontmatter: StandardFrontmatter = {
          title,
          created: now.toISOString(),
          tags: selectedTemplate.tags,
          ...selectedTemplate.frontmatter,
          ...customFields,
        };

        // Process content with variable substitution
        const content = processTemplate(selectedTemplate.content, {
          title,
          date: formatDate(now),
          datetime: now.toISOString(),
        });

        await client.createNote(filePath, content, frontmatter);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Note created from "${template}" template`,
                  path: filePath,
                  template,
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
              text: `Error creating note from template: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: create_meeting_note
  // ---------------------------------------------------------------------------
  // Specialized tool for creating meeting notes.
  // ---------------------------------------------------------------------------

  server.tool(
    "create_meeting_note",
    "Create a structured meeting note with attendees, agenda, and action items.",
    {
      title: z.string().describe("Meeting title."),
      attendees: z.array(z.string()).optional().describe("List of attendees."),
      agenda: z.array(z.string()).optional().describe("Meeting agenda items."),
      date: z
        .string()
        .optional()
        .describe("Meeting date (ISO format). Defaults to today."),
      folder: z
        .string()
        .optional()
        .default("Meetings")
        .describe("Folder for meeting notes."),
    },
    async ({ title, attendees, agenda, date, folder }) => {
      try {
        const meetingDate = date ? new Date(date) : new Date();
        const dateStr = formatDate(meetingDate);

        // Generate filename with date
        const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, "-");
        const filePath = `${folder}/${dateStr} - ${sanitizedTitle}.md`;

        // Build frontmatter
        const frontmatter: StandardFrontmatter = {
          title,
          created: new Date().toISOString(),
          date: dateStr,
          tags: ["meeting"],
          attendees: attendees || [],
        };

        // Build content
        const lines: string[] = [];

        lines.push(`# ${title}`);
        lines.push("");
        lines.push(`**Date:** ${dateStr}`);
        lines.push("");

        if (attendees && attendees.length > 0) {
          lines.push("## Attendees");
          for (const attendee of attendees) {
            lines.push(`- ${attendee}`);
          }
          lines.push("");
        }

        if (agenda && agenda.length > 0) {
          lines.push("## Agenda");
          for (const item of agenda) {
            lines.push(`- [ ] ${item}`);
          }
          lines.push("");
        }

        lines.push("## Notes");
        lines.push("");
        lines.push("(Meeting notes go here)");
        lines.push("");
        lines.push("## Action Items");
        lines.push("");
        lines.push("- [ ] ");
        lines.push("");
        lines.push("## Follow-up");
        lines.push("");
        lines.push("(Next steps and follow-up items)");

        const content = lines.join("\n");

        await client.createNote(filePath, content, frontmatter);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Meeting note created",
                  path: filePath,
                  date: dateStr,
                  attendees: attendees || [],
                  agendaItems: agenda?.length || 0,
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
              text: `Error creating meeting note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: create_project_note
  // ---------------------------------------------------------------------------
  // Specialized tool for creating project notes.
  // ---------------------------------------------------------------------------

  server.tool(
    "create_project_note",
    "Create a structured project note with goals, tasks, and timeline.",
    {
      title: z.string().describe("Project name."),
      description: z.string().optional().describe("Project description."),
      goals: z.array(z.string()).optional().describe("Project goals."),
      status: z
        .enum(["planning", "active", "on-hold", "completed", "cancelled"])
        .optional()
        .default("planning")
        .describe("Project status."),
      dueDate: z.string().optional().describe("Due date (ISO format)."),
      folder: z
        .string()
        .optional()
        .default("Projects")
        .describe("Folder for project notes."),
    },
    async ({ title, description, goals, status, dueDate, folder }) => {
      try {
        const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, "-");
        const filePath = `${folder}/${sanitizedTitle}.md`;

        // Build frontmatter
        const frontmatter: StandardFrontmatter = {
          title,
          created: new Date().toISOString(),
          tags: ["project", status || "planning"],
          status: status || "planning",
        };

        if (dueDate) {
          (frontmatter as Record<string, unknown>).due = dueDate;
        }

        // Build content
        const lines: string[] = [];

        lines.push(`# ${title}`);
        lines.push("");

        if (description) {
          lines.push("## Overview");
          lines.push("");
          lines.push(description);
          lines.push("");
        }

        lines.push("## Status");
        lines.push("");
        lines.push(`**Status:** ${status || "planning"}`);
        if (dueDate) {
          lines.push(`**Due Date:** ${dueDate}`);
        }
        lines.push("");

        if (goals && goals.length > 0) {
          lines.push("## Goals");
          for (const goal of goals) {
            lines.push(`- [ ] ${goal}`);
          }
          lines.push("");
        }

        lines.push("## Tasks");
        lines.push("");
        lines.push("### To Do");
        lines.push("- [ ] ");
        lines.push("");
        lines.push("### In Progress");
        lines.push("");
        lines.push("### Done");
        lines.push("");

        lines.push("## Resources");
        lines.push("");
        lines.push("(Links to related resources)");
        lines.push("");

        lines.push("## Notes");
        lines.push("");
        lines.push("(Project notes and updates)");
        lines.push("");

        lines.push("## Log");
        lines.push("");
        lines.push(`- ${formatDate(new Date())}: Project created`);

        const content = lines.join("\n");

        await client.createNote(filePath, content, frontmatter);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Project note created",
                  path: filePath,
                  status,
                  goals: goals?.length || 0,
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
              text: `Error creating project note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // TOOL: list_templates
  // ---------------------------------------------------------------------------
  // List available templates.
  // ---------------------------------------------------------------------------

  server.tool(
    "list_templates",
    "List all available built-in templates and their descriptions.",
    {},
    async () => {
      const templates = getTemplates();

      const templateInfo = Object.entries(templates).map(([name, template]) => ({
        name,
        description: template.description,
        tags: template.tags,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                templates: templateInfo,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}

// =============================================================================
// Template Definitions
// =============================================================================

interface Template {
  description: string;
  tags: string[];
  frontmatter?: Record<string, unknown>;
  content: string;
}

function getTemplates(): Record<string, Template> {
  return {
    meeting: {
      description: "Template for meeting notes with attendees and action items",
      tags: ["meeting"],
      content: `# {{title}}

## Attendees

- 

## Agenda

- [ ] 

## Notes



## Action Items

- [ ] 

## Follow-up

`,
    },

    project: {
      description: "Template for project planning and tracking",
      tags: ["project"],
      frontmatter: { status: "planning" },
      content: `# {{title}}

## Overview



## Goals

- [ ] 

## Tasks

### To Do

- [ ] 

### In Progress



### Done



## Resources



## Notes



## Log

- {{date}}: Project created
`,
    },

    book: {
      description: "Template for book notes and summaries",
      tags: ["book", "reading"],
      frontmatter: { type: "book", rating: 0 },
      content: `# {{title}}

## Book Information

- **Author:** 
- **Published:** 
- **Genre:** 
- **Pages:** 

## Summary



## Key Takeaways

1. 
2. 
3. 

## Quotes

> 

## Notes



## Related Books

- 
`,
    },

    article: {
      description: "Template for article notes and highlights",
      tags: ["article", "reading"],
      frontmatter: { type: "article" },
      content: `# {{title}}

## Article Information

- **Author:** 
- **Source:** 
- **Date Read:** {{date}}
- **URL:** 

## Summary



## Key Points

- 

## Highlights

> 

## My Thoughts



## Related

- 
`,
    },

    person: {
      description: "Template for people notes (contacts, colleagues)",
      tags: ["person", "contact"],
      frontmatter: { type: "person" },
      content: `# {{title}}

## Contact Information

- **Email:** 
- **Phone:** 
- **Location:** 
- **Company:** 
- **Role:** 

## How We Met



## Notes



## Interactions

- {{date}}: 

## Related People

- 
`,
    },

    recipe: {
      description: "Template for recipes",
      tags: ["recipe", "cooking"],
      frontmatter: { type: "recipe" },
      content: `# {{title}}

## Information

- **Prep Time:** 
- **Cook Time:** 
- **Servings:** 
- **Difficulty:** 

## Ingredients

- 

## Instructions

1. 

## Notes



## Variations

- 

## Source

`,
    },

    decision: {
      description: "Template for decision documentation (ADR style)",
      tags: ["decision", "adr"],
      frontmatter: { type: "decision", status: "proposed" },
      content: `# {{title}}

## Status

Proposed | {{date}}

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive

- 

### Negative

- 

## Alternatives Considered

1. **Alternative 1**
   - Pros: 
   - Cons: 

## Related Decisions

- 
`,
    },
  };
}

/**
 * Process template content with variable substitution.
 */
function processTemplate(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  return result;
}
