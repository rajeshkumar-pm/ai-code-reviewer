import type { Octokit } from "@octokit/core";
import type { AppConfig } from "../config/schema.js";
import type { Reviewer, ReviewFinding } from "../reviewers/types.js";
import type { PullRequestContext } from "../github/diff.js";
import { postFindings } from "../github/comments.js";
import { logger } from "../utils/logger.js";

interface OrchestratorDeps {
  octokit: Octokit;
  reviewer: Reviewer;
  config: AppConfig;
  pr: PullRequestContext;
}

/**
 * Run the 3-pass Claude pipeline:
 *   Pass 1 (analysis)  → understand code structure, dependencies, data flow
 *   Pass 2 (review)    → deep security & vulnerability review
 *   Pass 3 (review)    → cross-check, verify, catch missed issues
 *
 * Analysis passes produce context text; review passes produce findings.
 * All findings are aggregated and posted to the PR.
 */
export async function runPipeline(deps: OrchestratorDeps): Promise<void> {
  const { octokit, reviewer, config, pr } = deps;
  const enabledPasses = config.reviewers.filter((r) => r.enabled);

  if (enabledPasses.length === 0) {
    logger.info("No passes enabled — skipping");
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

  let analysisContext = "";
  const allFindings: ReviewFinding[] = [];

  for (const passConfig of enabledPasses) {
    try {
      logger.info(
        { pass: passConfig.name, type: passConfig.passType },
        "Running pass"
      );

      const input = {
        pr,
        config: passConfig,
        priorFindings: [...allFindings],
        analysisContext,
      };

      if (passConfig.passType === "analysis") {
        // Analysis pass — capture context for later passes
        analysisContext = await reviewer.analyze(input);
        logger.info(
          { pass: passConfig.name, contextLength: analysisContext.length },
          "Analysis pass complete"
        );
      } else {
        // Review pass — collect findings
        const findings = await reviewer.review(input);
        logger.info(
          { pass: passConfig.name, findingCount: findings.length },
          "Review pass complete"
        );
        allFindings.push(...findings);
      }
    } catch (err) {
      logger.error(
        { err, pass: passConfig.name },
        "Pass failed — continuing pipeline"
      );
    }
  }

  // Post aggregated findings from all review passes
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
