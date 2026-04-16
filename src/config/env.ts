import fs from "node:fs";
import path from "node:path";

export interface EnvConfig {
  githubAppId: string;
  githubPrivateKey: string;
  githubWebhookSecret: string;

  anthropicApiKey: string;

  port: number;
  logLevel: string;
  smeeUrl?: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadEnv(): EnvConfig {
  const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;
  let githubPrivateKey = process.env.GITHUB_PRIVATE_KEY ?? "";

  if (!githubPrivateKey && privateKeyPath) {
    const resolved = path.resolve(privateKeyPath);
    githubPrivateKey = fs.readFileSync(resolved, "utf-8");
  }

  if (!githubPrivateKey) {
    throw new Error(
      "Provide GITHUB_PRIVATE_KEY or GITHUB_PRIVATE_KEY_PATH in env"
    );
  }

  return {
    githubAppId: requireEnv("GITHUB_APP_ID"),
    githubPrivateKey,
    githubWebhookSecret: requireEnv("GITHUB_WEBHOOK_SECRET"),

    anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),

    port: Number(process.env.PORT) || 3000,
    logLevel: process.env.LOG_LEVEL ?? "info",
    smeeUrl: process.env.SMEE_URL,
  };
}
