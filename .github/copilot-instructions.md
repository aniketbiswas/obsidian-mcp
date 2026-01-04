<!-- MCP Server Starter - Copilot Instructions -->

## Project Overview
This is an MCP (Model Context Protocol) server starter template built with TypeScript. Users can clone this repository and immediately start adding their own tools.

## Project Structure
- `src/index.ts` - Main entry point that initializes the MCP server
- `src/tools/` - Directory containing tool implementations
- `src/resources/` - Directory containing resource definitions
- `src/prompts/` - Directory containing prompt templates

## Adding New Tools
1. Create a new file in `src/tools/`
2. Export a function that registers tools with the server
3. Import and call the function in `src/index.ts`

## Key Dependencies
- `@modelcontextprotocol/sdk` - Official MCP SDK
- `zod` - Schema validation for tool parameters

## Build Commands
- `npm run build` - Build the TypeScript project
- `npm run dev` - Watch mode for development
- `npm run start` - Run the built server
- `npm run inspector` - Test with MCP Inspector

## Important Notes
- Use `console.error()` for logging (stdout is reserved for MCP protocol messages)
- Tool names should be lowercase with underscores
- Always validate inputs using Zod schemas
