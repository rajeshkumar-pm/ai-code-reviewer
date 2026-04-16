# AI Code Reviewer

A GitHub App that orchestrates **multi-AI code reviews**. When a PR is opened or updated, it runs Claude, Codex (GPT-4o), and Gemini in sequence — each reviewer sees the previous reviewers' findings to add depth without duplication — then posts the aggregated results as inline PR review comments.

## Architecture

```
PR opened/updated
       │
       ▼
  ┌─────────┐     ┌──────────────┐     ┌──────────────────────┐
  │  GitHub  │────▶│  Webhook     │────▶│  Pipeline            │
  │  Webhook │     │  Handler     │     │  Orchestrator        │
  └─────────┘     └──────────────┘     └──────┬───────────────┘
                                               │
                        ┌──────────────────────┼──────────────────────┐
                        ▼                      ▼                      ▼
                  ┌───────────┐         ┌───────────┐         ┌───────────┐
                  │  Claude   │────────▶│  Codex    │────────▶│  Gemini   │
                  │  (1st)    │findings │  (2nd)    │findings │  (3rd)    │
                  └───────────┘         └───────────┘         └───────────┘
                                                                      │
                                                               ▼
                                                    ┌──────────────────┐
                                                    │  Post PR Review  │
                                                    │  (inline + summary)│
                                                    └──────────────────┘
```

## Features

- **Multi-AI pipeline** — Claude → Codex → Gemini (order configurable)
- **Sequential context** — each reviewer sees prior findings to avoid duplication
- **Per-repo config** — `.ai-reviewer.yml` in repo root controls prompts, models, skills, and order
- **Inline comments** — findings are posted as line-level PR review comments
- **Resilient** — if one reviewer fails, the pipeline continues with the rest
- **File filtering** — ignore lock files, minified code, generated files via glob patterns

## Quick Start

### 1. Create a GitHub App

1. Go to **GitHub Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set the webhook URL to your server (e.g. `https://your-domain.com/api/webhooks`)
3. Set a webhook secret
4. Grant permissions:
   - **Pull requests**: Read & Write
   - **Contents**: Read
5. Subscribe to events:
   - **Pull request**
6. Generate a private key and download the `.pem` file

### 2. Configure environment

```bash
cp .env.example .env
# Fill in the values:
#   GITHUB_APP_ID, GITHUB_PRIVATE_KEY_PATH, GITHUB_WEBHOOK_SECRET
#   ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
```

### 3. Install and run

```bash
npm install
npm run build
npm start
```

### 4. Development mode

For local development, use [smee.io](https://smee.io) to forward webhooks:

```bash
# Set SMEE_URL in .env, then:
npm run dev
```

### 5. Install the App

Go to your GitHub App's page and click **Install** on the repositories you want reviewed.

### 6. Configure per-repo (optional)

Drop a `.ai-reviewer.yml` in your repo root. See [.ai-reviewer.example.yml](.ai-reviewer.example.yml) for all options.

## Configuration

### `.ai-reviewer.yml`

| Key | Description |
|-----|-------------|
| `reviewers[].name` | `claude`, `codex`, or `gemini` |
| `reviewers[].enabled` | Toggle a reviewer on/off |
| `reviewers[].model` | Model ID to use |
| `reviewers[].prompt` | Custom system prompt |
| `reviewers[].skills` | Focus areas (included in prompt context) |
| `settings.post_as` | `review` (inline), `comment` (summary), or `both` |
| `settings.max_files` | Skip PRs with more files than this |
| `settings.ignore_patterns` | Glob patterns for files to skip |
| `settings.fail_on_severity` | Request changes at this severity level |

### Changing reviewer order

The order in the `reviewers` array **is** the execution order. To run Gemini first:

```yaml
reviewers:
  - name: gemini
    enabled: true
    # ...
  - name: claude
    enabled: true
    # ...
  - name: codex
    enabled: true
    # ...
```

## Deployment

### Docker

```bash
docker build -t ai-code-reviewer .
docker run -p 3000:3000 --env-file .env ai-code-reviewer
```

### Cloud Run / Railway / Fly.io

The app is a stateless HTTP server — deploy anywhere that runs Docker or Node.js.

## Project Structure

```
src/
├── index.ts              # Entry point
├── server.ts             # Express server + webhook routing
├── config/
│   ├── env.ts            # Environment variable loading
│   ├── schema.ts         # Config types and defaults
│   └── loader.ts         # Load .ai-reviewer.yml from repo
├── github/
│   ├── app.ts            # GitHub App initialization
│   ├── diff.ts           # Fetch PR files and patches
│   └── comments.ts       # Post review findings to PR
├── reviewers/
│   ├── types.ts          # Reviewer interface
│   ├── prompt.ts         # Shared prompt builder
│   ├── parse.ts          # Parse AI response → findings
│   ├── claude.ts         # Anthropic Claude
│   ├── codex.ts          # OpenAI GPT/Codex
│   ├── gemini.ts         # Google Gemini
│   └── registry.ts       # Build reviewer map
├── pipeline/
│   └── orchestrator.ts   # Sequential review pipeline
└── utils/
    └── logger.ts         # Structured logging (pino)
```
