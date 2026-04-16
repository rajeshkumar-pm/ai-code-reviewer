import type { Octokit } from "@octokit/core";
import { minimatch } from "minimatch";

export interface ChangedFile {
  filename: string;
  status: string;
  patch: string;
  additions: number;
  deletions: number;
}

export interface PullRequestContext {
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  baseSha: string;
  title: string;
  body: string;
  files: ChangedFile[];
}

/**
 * Fetch the full PR context: metadata + changed files with patches.
 */
export async function fetchPRContext(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  ignorePatterns: string[]
): Promise<PullRequestContext> {
  const { data: pr } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    { owner, repo, pull_number: pullNumber }
  );

  const files: ChangedFile[] = [];
  let page = 1;

  // Paginate through all changed files
  while (true) {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
      { owner, repo, pull_number: pullNumber, per_page: 100, page }
    );

    for (const f of data) {
      if (!f.patch) continue; // binary files
      if (shouldIgnore(f.filename, ignorePatterns)) continue;

      files.push({
        filename: f.filename,
        status: f.status,
        patch: f.patch,
        additions: f.additions,
        deletions: f.deletions,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return {
    owner,
    repo,
    pullNumber,
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
    title: pr.title,
    body: pr.body ?? "",
    files,
  };
}

function shouldIgnore(filename: string, patterns: string[]): boolean {
  return patterns.some((p) => minimatch(filename, p));
}
