// ── Configuration types for the 3-pass Claude review pipeline ────────

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type PostMode = "review" | "comment" | "both";

export interface ReviewerConfig {
  /** Unique name for this pass (e.g. "code-analyst", "security-reviewer") */
  name: string;
  enabled: boolean;
  model: string;
  prompt: string;
  skills: string[];
  maxTokens: number;
  /**
   * "analysis" passes produce context for later passes but don't generate findings.
   * "review" passes produce findings that get posted to the PR.
   */
  passType: "analysis" | "review";
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

// ── Defaults: 3-pass Claude pipeline ────────────────────────────────

export const DEFAULT_CONFIG: AppConfig = {
  reviewers: [
    // ── Pass 1: Understand the code before reviewing it ───────────
    {
      name: "code-analyst",
      enabled: true,
      model: "claude-sonnet-4-20250514",
      passType: "analysis",
      prompt: [
        "You are a senior software architect. Your job is to deeply understand code changes BEFORE they are reviewed.",
        "",
        "Analyze the diff and produce a structured analysis covering:",
        "1. **Function inventory** — every function/method added or modified, its signature, purpose, and return type",
        "2. **Dependency map** — imports, external packages, internal modules used and why",
        "3. **Data flow** — how data enters, transforms, and exits (inputs → processing → outputs)",
        "4. **State changes** — what state is mutated (DB, files, global variables, caches)",
        "5. **Integration points** — APIs called, events emitted, hooks triggered",
        "6. **Risk surface** — areas where user input reaches sensitive operations (auth, DB, file system, network)",
        "",
        "Be thorough. Later reviewers depend on this analysis to find real vulnerabilities.",
      ].join("\n"),
      skills: [
        "code-understanding",
        "dependency-analysis",
        "data-flow-tracing",
        "architecture",
      ],
      maxTokens: 4096,
    },

    // ── Pass 2: Deep security & vulnerability review ─────────────
    {
      name: "security-reviewer",
      enabled: true,
      model: "claude-sonnet-4-20250514",
      passType: "review",
      prompt: [
        "You are a senior application security engineer. Using the code analysis from the previous pass,",
        "perform a deep security and vulnerability review of the code changes.",
        "",
        "Check for ALL of the following:",
        "- **Injection** — SQL injection, command injection, template injection, XSS, LDAP injection",
        "- **Authentication & Authorization** — broken auth, missing access controls, privilege escalation",
        "- **Data Exposure** — hardcoded secrets, PII leaks, sensitive data in logs, insecure storage",
        "- **Input Validation** — missing validation, type coercion issues, path traversal, SSRF",
        "- **Cryptography** — weak algorithms, bad randomness, missing encryption",
        "- **Error Handling** — unhandled exceptions, information leakage in errors, fail-open patterns",
        "- **Dependencies** — known vulnerable packages, insecure usage patterns",
        "- **Race Conditions** — TOCTOU bugs, concurrent state mutation",
        "- **Resource Management** — memory leaks, unclosed handles, denial-of-service vectors",
        "",
        "For every finding: cite the exact file and line, explain the attack vector, and rate severity.",
        "Do NOT report style issues — only real vulnerabilities and correctness bugs.",
      ].join("\n"),
      skills: [
        "owasp-top-10",
        "injection-detection",
        "auth-review",
        "data-exposure",
        "input-validation",
        "dependency-audit",
      ],
      maxTokens: 4096,
    },

    // ── Pass 3: Cross-check, verify, and catch what was missed ───
    {
      name: "verification-pass",
      enabled: true,
      model: "claude-sonnet-4-20250514",
      passType: "review",
      prompt: [
        "You are an independent security auditor performing the final verification pass.",
        "Your job is to CROSS-CHECK the previous security review and catch anything that was missed.",
        "",
        "Do the following:",
        "1. **Verify each prior finding** — is it a real issue or a false positive? If false positive, say so.",
        "2. **Find missed vulnerabilities** — look at the code with fresh eyes, especially:",
        "   - Logic errors that enable security bypass",
        "   - Edge cases in error handling that leak information",
        "   - Implicit trust assumptions between components",
        "   - Business logic flaws (not just technical vulnerabilities)",
        "   - Missing rate limiting, missing audit logging",
        "3. **Check code quality issues that affect security** — race conditions, resource leaks, unsafe defaults",
        "",
        "Only report NEW findings (not already covered by the prior reviewer) and any false positives.",
        "For each finding: cite the exact file and line, explain the attack vector, and rate severity.",
      ].join("\n"),
      skills: [
        "false-positive-detection",
        "logic-flaws",
        "business-logic-security",
        "edge-case-analysis",
        "audit",
      ],
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
