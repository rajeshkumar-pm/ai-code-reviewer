import yaml from "js-yaml";
import type { Octokit } from "@octokit/core";
import {
  type AppConfig,
  type ReviewerConfig,
  type Settings,
  DEFAULT_CONFIG,
} from "./schema.js";
import { logger } from "../utils/logger.js";

const CONFIG_PATH = ".ai-reviewer.yml";

/**
 * Load .ai-reviewer.yml from the repository root.
 * Falls back to defaults if the file is missing or unparseable.
 */
export async function loadRepoConfig(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string
): Promise<AppConfig> {
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { owner, repo, path: CONFIG_PATH, ref }
    );

    if ("content" in data && typeof data.content === "string") {
      const raw = Buffer.from(data.content, "base64").toString("utf-8");
      const parsed = yaml.load(raw) as Record<string, unknown>;
      return mergeWithDefaults(parsed);
    }
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      logger.info("No .ai-reviewer.yml found — using defaults");
    } else {
      logger.warn({ err }, "Failed to load .ai-reviewer.yml — using defaults");
    }
  }

  return DEFAULT_CONFIG;
}

// ── Merge user config over defaults ──────────────────────────────────

function mergeWithDefaults(raw: Record<string, unknown>): AppConfig {
  const reviewers = mergeReviewers(raw.reviewers);
  const settings = mergeSettings(raw.settings);
  return { reviewers, settings };
}

function mergeReviewers(raw: unknown): ReviewerConfig[] {
  if (!Array.isArray(raw)) return DEFAULT_CONFIG.reviewers;

  const defaultMap = new Map(
    DEFAULT_CONFIG.reviewers.map((r) => [r.name, r])
  );

  return raw.map((entry: Record<string, unknown>) => {
    const name = entry.name as ReviewerConfig["name"];
    const base = defaultMap.get(name) ?? DEFAULT_CONFIG.reviewers[0]!;

    return {
      name,
      enabled: (entry.enabled as boolean) ?? base.enabled,
      model: (entry.model as string) ?? base.model,
      prompt: (entry.prompt as string) ?? base.prompt,
      skills: (entry.skills as string[]) ?? base.skills,
      maxTokens: (entry.max_tokens as number) ?? base.maxTokens,
    };
  });
}

function mergeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") return DEFAULT_CONFIG.settings;

  const s = raw as Record<string, unknown>;
  const d = DEFAULT_CONFIG.settings;

  return {
    postAs: (s.post_as as Settings["postAs"]) ?? d.postAs,
    maxFiles: (s.max_files as number) ?? d.maxFiles,
    ignorePatterns: (s.ignore_patterns as string[]) ?? d.ignorePatterns,
    failOnSeverity:
      (s.fail_on_severity as Settings["failOnSeverity"]) ?? d.failOnSeverity,
  };
}
