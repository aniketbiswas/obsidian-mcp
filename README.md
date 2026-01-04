# 🚀 MCP Server Starter

**Build your own AI tools in minutes!**

This is a starter template for building [MCP (Model Context Protocol)](https://modelcontextprotocol.io) servers. MCP lets you create tools that AI assistants like Claude, VS Code Copilot, and other AI apps can use.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.0-green.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 Table of Contents

- [What is MCP?](#-what-is-mcp)
- [Quick Start](#-quick-start-2-minutes)
- [Project Structure](#-project-structure)
- [Core Concepts](#-core-concepts)
- [Adding Tools](#-adding-your-first-tool)
- [Tool Examples](#-tool-examples-cookbook)
- [Adding Resources](#-adding-resources)
- [Adding Prompts](#-adding-prompts)
- [Zod Schema Reference](#-zod-schema-reference)
- [Connecting to AI Apps](#-connect-to-ai-apps)
- [Development Workflow](#-development-workflow)
- [Debugging](#-debugging)
- [Best Practices](#-best-practices)
- [FAQ](#-faq)
- [Resources](#-resources)

---

## 🤔 What is MCP?

**Model Context Protocol (MCP)** is an open protocol that lets AI assistants interact with external tools and data. Think of it as a USB port for AI—a standard way to plug in new capabilities.

### How It Works

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   AI Assistant  │  MCP    │   Your Server   │         │  External APIs  │
│  (Claude, etc)  │◄───────►│  (This repo!)   │◄───────►│  Databases, etc │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

1. AI assistant connects to your MCP server
2. Your server tells the AI what tools are available
3. AI decides when to use your tools based on user requests
4. Your tools execute and return results to the AI

### What Can MCP Servers Provide?

| Feature | Description | Example |
|---------|-------------|---------|
| **🔧 Tools** | Functions the AI can execute | Calculate, search, API calls |
| **📄 Resources** | Data the AI can read | Files, configs, documentation |
| **💬 Prompts** | Pre-built prompt templates | Code review, debugging help |

---

## ⚡ Quick Start (2 minutes)

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** - Comes with Node.js

### Installation

```bash
# 1. Clone this repository
git clone https://github.com/your-username/mcp-server-starter.git
cd mcp-server-starter

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Test your server!
npm run inspector
```

The inspector opens a web UI at `http://localhost:5173` where you can interactively test all your tools.

### Verify It's Working

In the inspector:
1. Click on "Tools" in the sidebar
2. Select `add` from the tool list
3. Enter values for `a` and `b`
4. Click "Run" - you should see the result!

---

## 📁 Project Structure

```
mcp-server-starter/
├── src/
│   ├── index.ts              # 🏠 Main entry point - starts the server
│   ├── tools/
│   │   ├── _template.ts      # 📋 COPY THIS to create new tools!
│   │   ├── calculator.ts     # ➕ Example: math operations
│   │   └── greeting.ts       # 👋 Example: greeting & utility tools
│   ├── resources/
│   │   └── index.ts          # 📄 Data sources AI can read
│   └── prompts/
│       └── index.ts          # 💬 Pre-built prompt templates
├── build/                    # 📦 Compiled JavaScript (generated)
├── package.json              # 📋 Dependencies and scripts
├── tsconfig.json             # ⚙️ TypeScript configuration
└── README.md                 # 📖 You are here!
```

### Key Files Explained

| File | Purpose |
|------|---------|
| `src/index.ts` | Creates the MCP server, imports all tools/resources/prompts, starts listening |
| `src/tools/_template.ts` | Copy this file to create new tools - has examples and comments |
| `src/tools/calculator.ts` | Example showing basic math tools with error handling |
| `src/tools/greeting.ts` | Example showing string tools, enums, optional params |
| `src/resources/index.ts` | Example showing how to expose data to AI |
| `src/prompts/index.ts` | Example showing reusable prompt templates |

---

## 🧠 Core Concepts

### 1. Tools

**Tools are functions that AI can execute.** They have:

- **Name**: Unique identifier (e.g., `search_files`)
- **Description**: Explains what the tool does (AI reads this!)
- **Parameters**: Input schema validated with Zod
- **Handler**: Async function that does the work

```typescript
server.tool(
  "tool_name",           // Name (lowercase_with_underscores)
  "What this tool does", // Description (be specific!)
  { /* parameters */ },  // Zod schema for inputs
  async (params) => {    // Handler function
    // Do work here
    return { content: [{ type: "text", text: "result" }] };
  }
);
```

### 2. Resources

**Resources are data sources that AI can read.** Unlike tools, they don't perform actions—they just provide information.

```typescript
server.resource(
  "mcp://server/config",        // URI (unique identifier)
  "Application configuration",  // Description
  { mimeType: "application/json" },
  async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(config) }]
  })
);
```

### 3. Prompts

**Prompts are reusable templates that structure AI interactions.**

```typescript
server.prompt(
  "code-review",                  // Name
  "Review code for issues",       // Description
  { code: z.string() },           // Arguments
  async ({ code }) => ({
    messages: [{
      role: "user",
      content: { type: "text", text: `Review this code:\n${code}` }
    }]
  })
);
```

---

## 🛠️ Adding Your First Tool

### Step 1: Create a new file

```bash
cp src/tools/_template.ts src/tools/my-tools.ts
```

### Step 2: Write your tool

Edit `src/tools/my-tools.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerMyTools(server: McpServer): void {
  
  // A simple tool
  server.tool(
    "hello_world",
    "Say hello to someone by name",
    {
      name: z.string().describe("The person's name to greet"),
    },
    async ({ name }) => {
      return {
        content: [{ 
          type: "text", 
          text: `Hello, ${name}! Welcome to MCP!` 
        }],
      };
    }
  );

  // Add more tools here...
}
```

### Step 3: Register your tools

Edit `src/index.ts` and add:

```typescript
// Add this import at the top
import { registerMyTools } from "./tools/my-tools.js";

// Add this line after other registrations (before server.connect)
registerMyTools(server);
```

### Step 4: Build and test

```bash
npm run build
npm run inspector
```

Your `hello_world` tool should now appear in the inspector!

---

## 📚 Tool Examples Cookbook

### 🔤 String Operations

```typescript
// Reverse a string
server.tool(
  "reverse_string",
  "Reverse the characters in a string",
  { text: z.string().describe("Text to reverse") },
  async ({ text }) => ({
    content: [{ type: "text", text: text.split("").reverse().join("") }],
  })
);

// Count words
server.tool(
  "count_words",
  "Count the number of words in text",
  { text: z.string().describe("Text to analyze") },
  async ({ text }) => {
    const count = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    return { content: [{ type: "text", text: `Word count: ${count}` }] };
  }
);
```

### 🔢 Math Operations

```typescript
// Calculate percentage
server.tool(
  "calculate_percentage",
  "Calculate what percentage A is of B",
  {
    part: z.number().describe("The part value"),
    whole: z.number().describe("The whole value"),
  },
  async ({ part, whole }) => {
    if (whole === 0) {
      return { content: [{ type: "text", text: "Error: Cannot divide by zero" }], isError: true };
    }
    const percentage = (part / whole) * 100;
    return { content: [{ type: "text", text: `${percentage.toFixed(2)}%` }] };
  }
);
```

### 📋 Working with Enums

```typescript
// Format text in different styles
server.tool(
  "format_text",
  "Format text in various styles",
  {
    text: z.string().describe("Text to format"),
    style: z.enum(["uppercase", "lowercase", "title", "sentence"])
      .describe("Formatting style to apply"),
  },
  async ({ text, style }) => {
    let result: string;
    switch (style) {
      case "uppercase": result = text.toUpperCase(); break;
      case "lowercase": result = text.toLowerCase(); break;
      case "title": result = text.replace(/\w\S*/g, t => 
        t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
      ); break;
      case "sentence": result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(); break;
    }
    return { content: [{ type: "text", text: result }] };
  }
);
```

### ❓ Optional Parameters

```typescript
// Greet with optional title
server.tool(
  "formal_greeting",
  "Generate a formal greeting",
  {
    name: z.string().describe("Person's name"),
    title: z.enum(["Mr", "Ms", "Mrs", "Dr", "Prof"]).optional()
      .describe("Optional title/honorific"),
    includeTime: z.boolean().optional().default(false)
      .describe("Include time-based greeting"),
  },
  async ({ name, title, includeTime }) => {
    const fullName = title ? `${title}. ${name}` : name;
    let greeting = `Hello, ${fullName}`;
    
    if (includeTime) {
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      greeting = `${timeGreeting}, ${fullName}`;
    }
    
    return { content: [{ type: "text", text: greeting }] };
  }
);
```

### 🌐 API Calls

```typescript
// Fetch data from an API
server.tool(
  "get_github_user",
  "Get information about a GitHub user",
  { username: z.string().describe("GitHub username") },
  async ({ username }) => {
    try {
      const response = await fetch(`https://api.github.com/users/${username}`);
      
      if (!response.ok) {
        return { 
          content: [{ type: "text", text: `User '${username}' not found` }], 
          isError: true 
        };
      }
      
      const user = await response.json();
      const info = [
        `Name: ${user.name || 'N/A'}`,
        `Bio: ${user.bio || 'N/A'}`,
        `Public Repos: ${user.public_repos}`,
        `Followers: ${user.followers}`,
      ].join('\n');
      
      return { content: [{ type: "text", text: info }] };
    } catch (error) {
      return { 
        content: [{ type: "text", text: `Error: ${error.message}` }], 
        isError: true 
      };
    }
  }
);
```

### 📂 File System Operations

```typescript
import * as fs from "fs/promises";
import * as path from "path";

// Read a file
server.tool(
  "read_file",
  "Read contents of a file",
  { 
    filePath: z.string().describe("Path to the file to read"),
    encoding: z.enum(["utf8", "base64"]).optional().default("utf8"),
  },
  async ({ filePath, encoding }) => {
    try {
      const content = await fs.readFile(filePath, encoding as BufferEncoding);
      return { content: [{ type: "text", text: content }] };
    } catch (error) {
      return { 
        content: [{ type: "text", text: `Error reading file: ${error.message}` }], 
        isError: true 
      };
    }
  }
);

// List directory contents
server.tool(
  "list_directory",
  "List files and folders in a directory",
  { dirPath: z.string().describe("Path to the directory") },
  async ({ dirPath }) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const listing = entries.map(e => 
        `${e.isDirectory() ? '📁' : '📄'} ${e.name}`
      ).join('\n');
      return { content: [{ type: "text", text: listing }] };
    } catch (error) {
      return { 
        content: [{ type: "text", text: `Error: ${error.message}` }], 
        isError: true 
      };
    }
  }
);
```

### 🗄️ Database Operations

```typescript
// Example with a hypothetical database
server.tool(
  "query_users",
  "Search for users in the database",
  {
    searchTerm: z.string().describe("Name or email to search for"),
    limit: z.number().min(1).max(100).optional().default(10)
      .describe("Maximum number of results"),
  },
  async ({ searchTerm, limit }) => {
    try {
      // Replace with your actual database query
      const results = await db.query(
        "SELECT * FROM users WHERE name LIKE ? OR email LIKE ? LIMIT ?",
        [`%${searchTerm}%`, `%${searchTerm}%`, limit]
      );
      
      if (results.length === 0) {
        return { content: [{ type: "text", text: "No users found" }] };
      }
      
      const formatted = results.map(u => `- ${u.name} (${u.email})`).join('\n');
      return { content: [{ type: "text", text: `Found ${results.length} users:\n${formatted}` }] };
    } catch (error) {
      return { 
        content: [{ type: "text", text: `Database error: ${error.message}` }], 
        isError: true 
      };
    }
  }
);
```

### ⚠️ Comprehensive Error Handling

```typescript
server.tool(
  "safe_divide",
  "Safely divide two numbers with comprehensive error handling",
  {
    dividend: z.number().describe("Number to be divided"),
    divisor: z.number().describe("Number to divide by"),
  },
  async ({ dividend, divisor }) => {
    // Validate inputs
    if (!Number.isFinite(dividend) || !Number.isFinite(divisor)) {
      return {
        content: [{ type: "text", text: "Error: Both inputs must be finite numbers" }],
        isError: true,
      };
    }

    // Check for division by zero
    if (divisor === 0) {
      return {
        content: [{ type: "text", text: "Error: Cannot divide by zero" }],
        isError: true,
      };
    }

    // Perform calculation
    const result = dividend / divisor;

    // Check for overflow
    if (!Number.isFinite(result)) {
      return {
        content: [{ type: "text", text: "Error: Result is too large" }],
        isError: true,
      };
    }

    return {
      content: [{ 
        type: "text", 
        text: `${dividend} ÷ ${divisor} = ${result}` 
      }],
    };
  }
);
```

---

## 📄 Adding Resources

Resources let AI read data from your server. Add them in `src/resources/index.ts`:

```typescript
// Static text resource
server.resource(
  "mcp://server/readme",
  "Project README file",
  { mimeType: "text/plain" },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: "This is the readme content..."
    }]
  })
);

// Dynamic JSON resource
server.resource(
  "mcp://server/status",
  "Current server status",
  { mimeType: "application/json" },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }, null, 2)
    }]
  })
);

// Resource from external source
server.resource(
  "mcp://server/config",
  "Application configuration",
  { mimeType: "application/json" },
  async (uri) => {
    const config = await loadConfigFromDatabase();
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(config, null, 2)
      }]
    };
  }
);
```

---

## 💬 Adding Prompts

Prompts are templates that help structure AI interactions. Add them in `src/prompts/index.ts`:

```typescript
// Simple prompt
server.prompt(
  "explain-code",
  "Explain what code does in simple terms",
  { code: z.string().describe("Code to explain") },
  async ({ code }) => ({
    messages: [{
      role: "user",
      content: { 
        type: "text", 
        text: `Please explain what this code does in simple terms:\n\n\`\`\`\n${code}\n\`\`\`` 
      }
    }]
  })
);

// Prompt with multiple parameters
server.prompt(
  "code-review",
  "Review code for potential issues",
  {
    code: z.string().describe("Code to review"),
    language: z.string().optional().describe("Programming language"),
    focus: z.enum(["security", "performance", "style", "all"]).optional().default("all")
      .describe("What to focus on"),
  },
  async ({ code, language, focus }) => ({
    messages: [{
      role: "user",
      content: { 
        type: "text", 
        text: `Review this ${language || ''} code for ${focus} issues:\n\n\`\`\`${language || ''}\n${code}\n\`\`\`\n\nProvide specific suggestions for improvement.`
      }
    }]
  })
);

// Multi-message prompt
server.prompt(
  "debug-assistant",
  "Help debug an issue",
  {
    error: z.string().describe("Error message or description"),
    code: z.string().optional().describe("Relevant code"),
    context: z.string().optional().describe("Additional context"),
  },
  async ({ error, code, context }) => ({
    messages: [
      {
        role: "user",
        content: { 
          type: "text", 
          text: `I'm encountering this error: ${error}` 
        }
      },
      ...(code ? [{
        role: "user" as const,
        content: { 
          type: "text" as const, 
          text: `Here's the relevant code:\n\`\`\`\n${code}\n\`\`\`` 
        }
      }] : []),
      ...(context ? [{
        role: "user" as const,
        content: { 
          type: "text" as const, 
          text: `Additional context: ${context}` 
        }
      }] : []),
      {
        role: "user",
        content: { 
          type: "text", 
          text: "Please help me understand and fix this issue." 
        }
      }
    ]
  })
);
```

---

## 📐 Zod Schema Reference

Zod is used to validate tool inputs. Here's a quick reference:

### Basic Types

```typescript
z.string()                    // Any string
z.number()                    // Any number
z.boolean()                   // true or false
z.null()                      // null
z.undefined()                 // undefined
z.any()                       // Any type (avoid if possible)
```

### String Validations

```typescript
z.string().min(1)             // At least 1 character
z.string().max(100)           // At most 100 characters
z.string().length(5)          // Exactly 5 characters
z.string().email()            // Valid email format
z.string().url()              // Valid URL format
z.string().uuid()             // Valid UUID
z.string().regex(/pattern/)   // Matches regex
z.string().startsWith("Hi")   // Starts with "Hi"
z.string().endsWith("!")      // Ends with "!"
```

### Number Validations

```typescript
z.number().min(0)             // >= 0
z.number().max(100)           // <= 100
z.number().positive()         // > 0
z.number().negative()         // < 0
z.number().int()              // Integer only
z.number().multipleOf(5)      // Divisible by 5
```

### Enums & Literals

```typescript
z.enum(["a", "b", "c"])       // One of these values
z.literal("exact")            // Exactly this value
z.union([z.string(), z.number()])  // String OR number
```

### Optional & Defaults

```typescript
z.string().optional()         // String or undefined
z.string().nullable()         // String or null
z.string().default("hi")      // Default if not provided
z.string().optional().default("hi")  // Optional with default
```

### Arrays & Objects

```typescript
z.array(z.string())           // Array of strings
z.array(z.number()).min(1)    // Non-empty number array
z.array(z.string()).max(10)   // At most 10 strings

z.object({                    // Object shape
  name: z.string(),
  age: z.number().optional(),
})
```

### Descriptions (Important!)

```typescript
// Always add descriptions - AI uses these!
z.string().describe("The user's email address")
z.number().min(1).max(5).describe("Rating from 1 to 5 stars")
z.enum(["asc", "desc"]).describe("Sort order")
```

---

## 🔌 Connect to AI Apps

### VS Code (Copilot)

The `.vscode/mcp.json` file is already included. Update the path:

```json
{
  "servers": {
    "mcp-server-starter": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-starter/build/index.js"]
    }
  }
}
```

Then reload VS Code and your tools will be available to Copilot!

### Claude Desktop (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-starter/build/index.js"]
    }
  }
}
```

### Claude Desktop (Windows)

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-server-starter\\build\\index.js"]
    }
  }
}
```

### With Environment Variables

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": {
        "API_KEY": "your-api-key",
        "DATABASE_URL": "postgres://..."
      }
    }
  }
}
```

---

## 🔄 Development Workflow

### Daily Development

```bash
# Start watch mode (auto-rebuilds on changes)
npm run dev

# In another terminal, run the inspector
npm run inspector
```

### Testing Changes

1. Make changes to your TypeScript files
2. Watch mode automatically rebuilds
3. In inspector, click "Reconnect" or refresh
4. Test your changes

### Before Committing

```bash
# Full build to catch any issues
npm run build

# Test in inspector
npm run inspector
```

---

## 🐛 Debugging

### Enable Debug Logging

Add to your code:

```typescript
// Use console.error for logging (stdout is for MCP protocol)
console.error("[DEBUG] Tool called with:", params);
```

### Common Issues

| Problem | Solution |
|---------|----------|
| "Tool not found" | Did you register it in `index.ts`? Did you rebuild? |
| "Cannot find module" | Use `.js` extension in imports (even for `.ts` files) |
| Server won't start | Check for syntax errors with `npm run build` |
| Inspector won't connect | Make sure no other server is running on the port |
| Changes not showing | Rebuild with `npm run build` and reconnect inspector |

### Viewing Protocol Messages

Run with debug output:

```bash
DEBUG=mcp* node build/index.js
```

---

## ✅ Best Practices

### Tool Design

1. **Naming**: Use `lowercase_with_underscores` (e.g., `search_files`, `send_email`)
2. **Single Purpose**: Each tool should do one thing well
3. **Clear Descriptions**: AI reads these to decide when to use your tool
4. **Parameter Descriptions**: Always use `.describe()` on every parameter

### Error Handling

1. **Always validate inputs** even though Zod helps
2. **Return `isError: true`** for failures so AI knows something went wrong
3. **Provide helpful error messages** that explain what went wrong
4. **Handle edge cases** (empty strings, zero values, null, etc.)

### Performance

1. **Keep tools fast** - AI waits for responses
2. **Use timeouts** for network requests
3. **Cache when appropriate** for repeated operations
4. **Stream large responses** if supported

### Security

1. **Never expose secrets** through tool responses
2. **Validate file paths** to prevent directory traversal
3. **Sanitize user input** before using in commands/queries
4. **Use environment variables** for sensitive configuration

---

## ❓ FAQ

### Q: Can I use JavaScript instead of TypeScript?

Yes! Remove `tsconfig.json`, rename files to `.js`, and update `package.json`:
```json
"scripts": {
  "start": "node src/index.js"
}
```

### Q: How do I add npm packages?

```bash
npm install package-name
npm install -D @types/package-name  # For TypeScript types
```

Then import and use in your tools.

### Q: Can one tool call another tool?

Yes, but it's better to extract shared logic into a regular function:

```typescript
// Shared logic
function calculateTax(amount: number, rate: number): number {
  return amount * rate;
}

// Tool 1 uses it
server.tool("calc_sales_tax", ..., async ({ amount }) => {
  const tax = calculateTax(amount, 0.08);
  return { content: [{ type: "text", text: `Tax: $${tax}` }] };
});

// Tool 2 also uses it  
server.tool("calc_income_tax", ..., async ({ income }) => {
  const tax = calculateTax(income, 0.25);
  return { content: [{ type: "text", text: `Tax: $${tax}` }] };
});
```

### Q: How do I return structured data?

Return JSON as a string:

```typescript
server.tool("get_user", ..., async ({ id }) => {
  const user = await fetchUser(id);
  return { 
    content: [{ 
      type: "text", 
      text: JSON.stringify(user, null, 2)  // Pretty-printed JSON
    }] 
  };
});
```

### Q: Can I return images or files?

Yes, using base64 encoding:

```typescript
server.tool("get_chart", ..., async (params) => {
  const imageBuffer = await generateChart(params);
  return {
    content: [{
      type: "image",
      data: imageBuffer.toString("base64"),
      mimeType: "image/png"
    }]
  };
});
```

### Q: How do I handle long-running operations?

MCP supports progress notifications for long operations:

```typescript
server.tool("long_task", ..., async (params, { sendProgress }) => {
  for (let i = 0; i <= 100; i += 10) {
    await doPartialWork();
    await sendProgress({ progress: i, total: 100 });
  }
  return { content: [{ type: "text", text: "Done!" }] };
});
```

---

## 📖 Commands Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Watch mode - auto-rebuild on changes |
| `npm run start` | Run the compiled server directly |
| `npm run inspector` | Open interactive testing UI |

---

## 🔗 Resources

### Official Documentation
- [MCP Documentation](https://modelcontextprotocol.io) - Full protocol docs
- [MCP Specification](https://modelcontextprotocol.io/specification) - Technical spec
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - SDK source

### Examples & Inspiration
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers) - Reference implementations
- [Awesome MCP](https://github.com/punkpeye/awesome-mcp-servers) - Community servers

### Related Tools
- [Zod Documentation](https://zod.dev) - Schema validation
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) - Testing tool

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT - Use this however you want!
