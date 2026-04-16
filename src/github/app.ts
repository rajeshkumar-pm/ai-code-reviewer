import { App } from "@octokit/app";
import type { EnvConfig } from "../config/env.js";

let app: App;

export function initGitHubApp(env: EnvConfig): App {
  app = new App({
    appId: env.githubAppId,
    privateKey: env.githubPrivateKey,
    webhooks: { secret: env.githubWebhookSecret },
  });
  return app;
}

export function getApp(): App {
  if (!app) throw new Error("GitHub App not initialized — call initGitHubApp first");
  return app;
}
