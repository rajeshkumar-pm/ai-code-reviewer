import type { Reviewer } from "./types.js";
import type { EnvConfig } from "../config/env.js";
import { ClaudeReviewer } from "./claude.js";
import { logger } from "../utils/logger.js";

/**
 * Build a single Claude reviewer instance.
 * The pipeline runs it multiple times with different configs (prompts/skills).
 */
export function buildReviewer(env: EnvConfig): Reviewer {
  if (!env.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }

  logger.info("Claude reviewer initialized");
  return new ClaudeReviewer(env.anthropicApiKey);
}
