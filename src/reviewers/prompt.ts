import type { ReviewInput } from "./types.js";

/**
 * Build the system + user prompt sent to each AI model.
 * Shared across all reviewer implementations.
 */
export function buildSystemPrompt(input: ReviewInput): string {
  const { config, priorFindings } = input;

  const lines = [
    config.prompt,
    "",
    "## Skills / Focus Areas",
    ...config.skills.map((s) => `- ${s}`),
    "",
    "## Output Format",
    "Return a JSON array of findings. Each finding is an object:",
    '  { "severity": "critical|high|medium|low|info", "file": "path/to/file", "line": 42, "message": "Explanation" }',
    "If a finding is general (not tied to a file), omit file and line.",
    "Return ONLY the JSON array — no markdown fences, no extra text.",
  ];

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
