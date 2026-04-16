import express from "express";
import type { App } from "@octokit/app";
import type { Reviewer } from "./reviewers/types.js";
import { loadRepoConfig } from "./config/loader.js";
import { fetchPRContext } from "./github/diff.js";
import { runPipeline } from "./pipeline/orchestrator.js";
import { logger } from "./utils/logger.js";

interface ServerDeps {
  app: App;
  reviewer: Reviewer;
  port: number;
}

export function createServer(deps: ServerDeps): express.Express {
  const { app, reviewer, port } = deps;
  const server = express();

  // ── Health check ───────────────────────────────────────────────────
  server.get("/health", (_req, res) => {
    res.json({ status: "ok", reviewer: reviewer.name });
  });

  // ── Webhook endpoint ──────────────────────────────────────────────
  server.post(
    "/api/webhooks",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const id = req.headers["x-github-delivery"] as string;
      const event = req.headers["x-github-event"] as string;
      const signature = req.headers["x-hub-signature-256"] as string;

      try {
        await app.webhooks.verifyAndReceive({
          id,
          name: event as any,
          payload: req.body.toString(),
          signature,
        });
        res.status(200).json({ ok: true });
      } catch (err) {
        logger.error({ err, event, id }, "Webhook verification failed");
        res.status(400).json({ error: "Invalid webhook" });
      }
    }
  );

  // ── Register webhook handlers ─────────────────────────────────────
  registerWebhooks(app, reviewer);

  server.listen(port, () => {
    logger.info({ port }, "AI Code Reviewer listening");
  });

  return server;
}

// ── Allowed orgs/repos (security: ignore webhooks from unauthorized sources) ──

function isAllowed(owner: string, repo: string): boolean {
  const allowList = process.env.ALLOWED_REPOS;
  if (!allowList) return true; // no allowlist = allow all (for dev)

  const entries = allowList.split(",").map((e) => e.trim().toLowerCase());
  const fullName = `${owner}/${repo}`.toLowerCase();
  const orgName = owner.toLowerCase();

  return entries.some((e) => e === fullName || e === orgName);
}

// ── Webhook event handling ──────────────────────────────────────────

function registerWebhooks(app: App, reviewer: Reviewer): void {
  app.webhooks.on(
    ["pull_request.opened", "pull_request.synchronize", "pull_request.reopened"],
    async ({ payload, octokit }) => {
      const { pull_request: pr, repository } = payload;
      const owner = repository.owner.login;
      const repo = repository.name;
      const pullNumber = pr.number;

      // Security: only process allowed orgs/repos
      if (!isAllowed(owner, repo)) {
        logger.warn({ owner, repo }, "Blocked — not in ALLOWED_REPOS");
        return;
      }

      logger.info(
        { owner, repo, pullNumber, action: payload.action },
        "PR event received"
      );

      try {
        // 1. Load per-repo config
        const config = await loadRepoConfig(
          octokit as any,
          owner,
          repo,
          pr.head.sha
        );

        // 2. Fetch the diff
        const prContext = await fetchPRContext(
          octokit as any,
          owner,
          repo,
          pullNumber,
          config.settings.ignorePatterns
        );

        // 3. Run the 3-pass review pipeline
        await runPipeline({
          octokit: octokit as any,
          reviewer,
          config,
          pr: prContext,
        });
      } catch (err) {
        logger.error({ err, owner, repo, pullNumber }, "Review pipeline failed");
      }
    }
  );

  app.webhooks.onError((err) => {
    logger.error({ err: err.message }, "Webhook handler error");
  });
}
