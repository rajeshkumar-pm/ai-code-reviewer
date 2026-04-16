import type { Severity, ReviewerConfig } from "../config/schema.js";
import type { PullRequestContext } from "../github/diff.js";

export interface ReviewFinding {
  reviewer: string;
  severity: Severity;
  file?: string;
  line?: number;
  message: string;
}

export interface ReviewInput {
  pr: PullRequestContext;
  config: ReviewerConfig;
  /** Findings from earlier review passes — for context, not duplication */
  priorFindings: ReviewFinding[];
  /** Analysis text from the code-analyst pass */
  analysisContext: string;
}

export interface Reviewer {
  readonly name: string;
  review(input: ReviewInput): Promise<ReviewFinding[]>;
  /** Run an analysis-only pass — returns free-form text, not findings */
  analyze(input: ReviewInput): Promise<string>;
}
