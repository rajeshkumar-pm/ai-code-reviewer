import type { Reviewer } from "./types.js";
import type { ReviewerName } from "../config/schema.js";
import type { EnvConfig } from "../config/env.js";
import { ClaudeReviewer } from "./claude.js";
import { CodexReviewer } from "./codex.js";
import { GeminiReviewer } from "./gemini.js";
import { logger } from "../utils/logger.js";

/**
 * Build the reviewer registry: name → Reviewer instance.
 * Only creates reviewers whose API keys are configured.
 */
export function buildRegistry(env: EnvConfig): Map<ReviewerName, Reviewer> {
  const registry = new Map<ReviewerName, Reviewer>();

  if (env.anthropicApiKey) {
    registry.set("claude", new ClaudeReviewer(env.anthropicApiKey));
  } else {
    logger.warn("ANTHROPIC_API_KEY not set — Claude reviewer disabled");
  }

  if (env.openaiApiKey) {
    registry.set("codex", new CodexReviewer(env.openaiApiKey));
  } else {
    logger.warn("OPENAI_API_KEY not set — Codex reviewer disabled");
  }

  if (env.geminiApiKey) {
    registry.set("gemini", new GeminiReviewer(env.geminiApiKey));
  } else {
    logger.warn("GEMINI_API_KEY not set — Gemini reviewer disabled");
  }

  return registry;
}
