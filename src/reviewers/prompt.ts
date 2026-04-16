import type { ReviewInput } from "./types.js";

/**
 * Build the system prompt sent to Claude for each pass.
 */
export function buildSystemPrompt(input: ReviewInput): string {
  const { config, priorFindings, analysisContext } = input;

  const lines = [
    config.prompt,
    "",
    "## Skills / Focus Areas",
    ...config.skills.map((s) => `- ${s}`),
  ];

  // For review passes, include the structured output format
  if (config.passType === "review") {
    lines.push(
      "",
      "## Output Format",
      "Return a JSON array of findings. Each finding is an object:",
      '  { "severity": "critical|high|medium|low|info", "file": "path/to/file", "line": 42, "message": "Explanation" }',
      "If a finding is general (not tied to a file), omit file and line.",
      "Return ONLY the JSON array — no markdown fences, no extra text."
    );
  }

  // Inject the analysis context from Pass 1 into Pass 2 and 3
  if (analysisContext) {
    lines.push(
      "",
      "## Code Analysis (from prior pass — use this to understand the code)",
      analysisContext
    );
  }

  // Inject prior findings from earlier review passes
  if (priorFindings.length > 0) {
    lines.push(
      "",
      "## Previous Reviewer Findings (for context — avoid duplicating these)",
      JSON.stringify(priorFindings, null, 2)
    );
  }

  return lines.join("\n");
}

export function buildUserPrompt(input: ReviewInput): string {
  const { pr } = input;

  const fileDiffs = pr.files
    .map(
      (f) =>
        `### ${f.filename} (${f.status}, +${f.additions} -${f.deletions})\n\`\`\`diff\n${f.patch}\n\`\`\``
    )
    .join("\n\n");

  return [
    `## Pull Request: ${pr.title}`,
    pr.body ? `\n${pr.body}\n` : "",
    `## Changed Files (${pr.files.length})\n`,
    fileDiffs,
  ].join("\n");
}
