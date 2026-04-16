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
  /** Findings from earlier reviewers in the pipeline — for context, not duplication */
  priorFindings: ReviewFinding[];
}

export interface Reviewer {
  readonly name: string;
  review(input: ReviewInput): Promise<ReviewFinding[]>;
}
