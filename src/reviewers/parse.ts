import type { ReviewFinding, } from "./types.js";
import type { Severity } from "../config/schema.js";
import { logger } from "../utils/logger.js";

const VALID_SEVERITIES = new Set<Severity>([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

/**
 * Parse the raw AI response text into structured findings.
 * Handles both `[...]` arrays and `{ "findings": [...] }` wrappers.
 * Resilient to markdown fences and preamble text.
 */
export function parseFindings(
  raw: string,
  reviewerName: string
): ReviewFinding[] {
  try {
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.findings)
        ? parsed.findings
        : [];

    return (arr as Record<string, unknown>[])
      .map((item) => normalize(item, reviewerName))
      .filter((f: ReviewFinding | null): f is ReviewFinding => f !== null);
  } catch {
    logger.warn(
      { reviewer: reviewerName, rawLength: raw.length },
      "Failed to parse reviewer response — attempting line-by-line extraction"
    );
    return extractFromText(raw, reviewerName);
  }
}

function normalize(
  item: Record<string, unknown>,
  reviewer: string
): ReviewFinding | null {
  const severity = String(item.severity ?? "info").toLowerCase() as Severity;
  const message = String(item.message ?? "").trim();

  if (!message) return null;

  return {
    reviewer,
    severity: VALID_SEVERITIES.has(severity) ? severity : "info",
    file: item.file ? String(item.file) : undefined,
    line: typeof item.line === "number" ? item.line : undefined,
    message,
  };
}

/**
 * Last-resort: try to find JSON array fragments in the text.
 */
function extractFromText(
  raw: string,
  reviewerName: string
): ReviewFinding[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    return (arr as Record<string, unknown>[])
      .map((item) => normalize(item, reviewerName))
      .filter((f: ReviewFinding | null): f is ReviewFinding => f !== null);
  } catch {
    return [];
  }
}
