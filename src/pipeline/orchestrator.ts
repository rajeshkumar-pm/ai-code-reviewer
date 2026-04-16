import type { Octokit } from "@octokit/core";
import type { ReviewerName, AppConfig } from "../config/schema.js";
import type { Reviewer, ReviewFinding } from "../reviewers/types.js";
import type { PullRequestContext } from "../github/diff.js";
import { postFindings } from "../github/comments.js";
import { logger } from "../utils/logger.js";

interface OrchestratorDeps {
  octokit: Octokit;
  registry: Map<ReviewerName, Reviewer>;
  config: AppConfig;
  pr: PullRequestContext;
}

/**
 * Run every enabled reviewer in the configured order.
 * Each reviewer receives the findings from all prior reviewers
 * so it can add depth without duplicating.
 */
export async function runPipeline(deps: OrchestratorDeps): Promise<void> {
  const { octokit, registry, config, pr } = deps;
  const enabledReviewers = config.reviewers.filter((r) => r.enabled);

  if (enabledReviewers.length === 0) {
    logger.info("No reviewers enabled — skipping");
    return;
  }

  if (pr.files.length === 0) {
    logger.info("No reviewable files in PR — skipping");
    return;
  }

  if (pr.files.length > config.settings.maxFiles) {
    logger.info(
      { fileCount: pr.files.length, max: config.settings.maxFiles },
      "PR exceeds maxFiles — skipping"
    );
    return;
  }

  const allFindings: ReviewFinding[] = [];

  for (const reviewerConfig of enabledReviewers) {
    const reviewer = registry.get(reviewerConfig.name);
    if (!reviewer) {
      logger.warn(
        { name: reviewerConfig.name },
        "Reviewer enabled but not in registry (missing API key?) — skipping"
      );
      continue;
    }

    try {
      logger.info({ reviewer: reviewerConfig.name }, "Running reviewer");

      const findings = await reviewer.review({
        pr,
        config: reviewerConfig,
        priorFindings: [...allFindings],
      });

      logger.info(
        { reviewer: reviewerConfig.name, findingCount: findings.length },
        "Reviewer complete"
      );

      allFindings.push(...findings);
    } catch (err) {
      logger.error(
        { err, reviewer: reviewerConfig.name },
        "Reviewer failed — continuing pipeline"
      );
    }
  }

  // Post aggregated findings
  await postFindings({
    octokit,
    owner: pr.owner,
    repo: pr.repo,
    pullNumber: pr.pullNumber,
    commitSha: pr.headSha,
    findings: allFindings,
    postAs: config.settings.postAs,
  });

  logger.info(
    { totalFindings: allFindings.length },
    "Pipeline complete — findings posted"
  );
}
