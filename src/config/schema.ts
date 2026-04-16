// ── Configuration types for the multi-AI review pipeline ─────────────

export type ReviewerName = "claude" | "codex" | "gemini";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type PostMode = "review" | "comment" | "both";

export interface ReviewerConfig {
  name: ReviewerName;
  enabled: boolean;
  model: string;
  prompt: string;
  skills: string[];
  /** Max tokens the model can use for its response */
  maxTokens: number;
}

export interface Settings {
  postAs: PostMode;
  maxFiles: number;
  ignorePatterns: string[];
  failOnSeverity: Severity | "none";
}

export interface AppConfig {
  reviewers: ReviewerConfig[];
  settings: Settings;
}

// ── Defaults ────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: AppConfig = {
  reviewers: [
    {
      name: "claude",
      enabled: true,
      model: "claude-sonnet-4-20250514",
      prompt: [
        "You are an expert code reviewer. Analyze the code changes and provide actionable feedback.",
        "Focus on: security vulnerabilities, performance issues, code quality, and best practices.",
        "Be specific — reference exact lines and explain *why* something is a problem.",
      ].join("\n"),
      skills: ["security", "performance", "best-practices"],
      maxTokens: 4096,
    },
    {
      name: "codex",
      enabled: true,
      model: "gpt-4o",
      prompt: [
        "You are an expert code reviewer. Analyze the code changes and provide actionable feedback.",
        "Focus on: logic errors, edge cases, test coverage gaps, and correctness.",
        "Be specific — reference exact lines and explain *why* something is a problem.",
      ].join("\n"),
      skills: ["logic", "edge-cases", "correctness"],
      maxTokens: 4096,
    },
    {
      name: "gemini",
      enabled: true,
      model: "gemini-2.0-flash",
      prompt: [
        "You are an expert code reviewer performing the final review pass.",
        "Focus on: architecture alignment, maintainability, documentation gaps, and design patterns.",
        "Be specific — reference exact lines and explain *why* something is a problem.",
      ].join("\n"),
      skills: ["architecture", "maintainability", "documentation"],
      maxTokens: 4096,
    },
  ],
  settings: {
    postAs: "review",
    maxFiles: 50,
    ignorePatterns: ["*.lock", "*.min.js", "*.min.css", "dist/**", "vendor/**"],
    failOnSeverity: "none",
  },
};
