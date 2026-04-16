import { loadEnv } from "./config/env.js";
import { initGitHubApp } from "./github/app.js";
import { buildReviewer } from "./reviewers/registry.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  // 1. Load environment
  const env = loadEnv();
  logger.info("Environment loaded");

  // 2. Initialize GitHub App
  const app = initGitHubApp(env);
  logger.info({ appId: env.githubAppId }, "GitHub App initialized");

  // 3. Build Claude reviewer
  const reviewer = buildReviewer(env);

  // 4. Start Smee proxy in dev (forwards webhooks to localhost)
  if (env.smeeUrl) {
    const { default: SmeeClient } = await import("smee-client");
    const smee = new SmeeClient({
      source: env.smeeUrl,
      target: `http://localhost:${env.port}/api/webhooks`,
      logger: {
        info: (msg: string) => logger.debug(msg),
        error: (msg: string) => logger.error(msg),
      },
    });
    smee.start();
    logger.info({ smeeUrl: env.smeeUrl }, "Smee proxy started");
  }

  // 5. Start the server
  createServer({
    app,
    reviewer,
    port: env.port,
  });
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start");
  process.exit(1);
});
