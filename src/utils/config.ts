/**
 * ============================================================================
 * OBSIDIAN MCP - Configuration Utilities
 * ============================================================================
 *
 * Configuration management for the Obsidian MCP server.
 * Handles environment variables and default configuration values.
 * ============================================================================
 */

import {
  ObsidianConfig,
  DEFAULT_CONFIG,
} from "../types/obsidian.js";

/**
 * Environment variable names for configuration
 */
const ENV_VARS = {
  API_KEY: "OBSIDIAN_API_KEY",
  HOST: "OBSIDIAN_HOST",
  PORT: "OBSIDIAN_PORT",
  SECURE: "OBSIDIAN_SECURE",
  TIMEOUT: "OBSIDIAN_TIMEOUT",
  VERIFY_SSL: "OBSIDIAN_VERIFY_SSL",
} as const;

/**
 * Get the Obsidian configuration from environment variables.
 * Throws an error if the required API key is not set.
 *
 * @returns The complete Obsidian configuration
 * @throws Error if OBSIDIAN_API_KEY environment variable is not set
 */
export function getConfig(): ObsidianConfig {
  const apiKey = process.env[ENV_VARS.API_KEY];

  if (!apiKey) {
    throw new Error(
      `Missing required environment variable: ${ENV_VARS.API_KEY}\n` +
        "Please set your Obsidian Local REST API key.\n" +
        "You can find this in Obsidian Settings > Local REST API > API Key"
    );
  }

  return {
    apiKey,
    host: process.env[ENV_VARS.HOST] || DEFAULT_CONFIG.host,
    port: parseInt(process.env[ENV_VARS.PORT] || String(DEFAULT_CONFIG.port), 10),
    secure: parseBooleanEnv(ENV_VARS.SECURE, DEFAULT_CONFIG.secure),
    timeout: parseInt(
      process.env[ENV_VARS.TIMEOUT] || String(DEFAULT_CONFIG.timeout),
      10
    ),
    verifySsl: parseBooleanEnv(ENV_VARS.VERIFY_SSL, DEFAULT_CONFIG.verifySsl),
  };
}

/**
 * Try to get the config without throwing.
 * Returns null if configuration is incomplete.
 *
 * @returns The configuration or null if not available
 */
export function tryGetConfig(): ObsidianConfig | null {
  try {
    return getConfig();
  } catch {
    return null;
  }
}

/**
 * Check if the required configuration is available.
 *
 * @returns True if configuration is complete
 */
export function isConfigured(): boolean {
  return !!process.env[ENV_VARS.API_KEY];
}

/**
 * Get the base URL for the Obsidian API.
 *
 * @param config - The configuration object
 * @returns The base URL string
 */
export function getBaseUrl(config: ObsidianConfig): string {
  const protocol = config.secure ? "https" : "http";
  return `${protocol}://${config.host}:${config.port}`;
}

/**
 * Parse a boolean from an environment variable.
 *
 * @param envVar - The environment variable name
 * @param defaultValue - Default value if not set
 * @returns The parsed boolean value
 */
function parseBooleanEnv(envVar: string, defaultValue: boolean): boolean {
  const value = process.env[envVar];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Configuration documentation for users
 */
export const CONFIG_DOCS = `
Obsidian MCP Server Configuration
=================================

Required Environment Variables:
-------------------------------
${ENV_VARS.API_KEY}     : Your Obsidian Local REST API key (REQUIRED)
                        Find it in: Obsidian Settings > Local REST API > API Key

Optional Environment Variables:
-------------------------------
${ENV_VARS.HOST}        : Host where Obsidian runs (default: ${DEFAULT_CONFIG.host})
${ENV_VARS.PORT}        : REST API port (default: ${DEFAULT_CONFIG.port})
${ENV_VARS.SECURE}      : Use HTTPS (default: ${DEFAULT_CONFIG.secure})
${ENV_VARS.TIMEOUT}     : Request timeout in ms (default: ${DEFAULT_CONFIG.timeout})
${ENV_VARS.VERIFY_SSL}  : Verify SSL certificates (default: ${DEFAULT_CONFIG.verifySsl})

Example .env file:
------------------
${ENV_VARS.API_KEY}=your-api-key-here
${ENV_VARS.HOST}=127.0.0.1
${ENV_VARS.PORT}=27124
`;
