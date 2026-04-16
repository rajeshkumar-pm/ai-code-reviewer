# AI Code Reviewer

A GitHub App that runs a **3-pass Claude review pipeline** on every pull request. It first understands the code (structure, dependencies, data flow), then performs a deep security review, then cross-checks and verifies the findings — all using Claude with different specialized prompts.

## How It Works

```
PR opened/updated
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  Pass 1: Code Analyst (analysis)                │
  │  → Understands functions, deps, data flow,      │
  │    state changes, risk surface                   │
  └──────────────────────┬──────────────────────────┘
                         │ context
                         ▼
  ┌─────────────────────────────────────────────────┐
  │  Pass 2: Security Reviewer (review)             │
  │  → OWASP top 10, injection, auth, data exposure,│
  │    input validation, error handling              │
  └──────────────────────┬──────────────────────────┘
                         │ findings
                         ▼
  ┌─────────────────────────────────────────────────┐
  │  Pass 3: Verification Pass (review)             │
  │  → Cross-check, flag false positives,           │
  │    catch missed logic/business logic flaws       │
  └──────────────────────┬──────────────────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │  Post PR Review  │
               │  (inline comments)│
               └──────────────────┘
```

## Features

- **3-pass pipeline** — analyze → review → verify (order and prompts configurable)
- **Pre-review analysis** — Claude understands code structure before reviewing it
- **Cross-checking** — final pass catches false positives and missed issues
- **Per-repo config** — `.ai-reviewer.yml` in repo root controls everything
- **Inline PR comments** — findings posted as line-level review comments
- **Resilient** — if one pass fails, the pipeline continues with the rest

## Quick Start

### 1. Create a GitHub App

Run the setup script:

```bash
npm install
npx tsx scripts/setup-app.ts
```

This opens your browser, you click "Create GitHub App", and it saves the credentials automatically.

### 2. Add your Claude API key to `.env`

```bash
# .env was auto-created by the setup script — just add:
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run

```bash
npm run dev    # development (with Smee webhook proxy)
npm run build && npm start  # production
```

### 4. Install the App

Go to your GitHub App's page and click **Install** on the repositories you want reviewed.

### 5. Configure per-repo (optional)

Drop a `.ai-reviewer.yml` in your repo root. See [.ai-reviewer.example.yml](.ai-reviewer.example.yml) for all options.

## Configuration

### `.ai-reviewer.yml`

| Key | Description |
|-----|-------------|
| `reviewers[].name` | Unique name for this pass |
| `reviewers[].enabled` | Toggle a pass on/off |
| `reviewers[].model` | Claude model ID |
| `reviewers[].pass_type` | `analysis` (context only) or `review` (produces findings) |
| `reviewers[].prompt` | Custom system prompt for this pass |
| `reviewers[].skills` | Focus areas (included in prompt context) |
| `settings.post_as` | `review` (inline), `comment` (summary), or `both` |
| `settings.max_files` | Skip PRs with more files than this |
| `settings.ignore_patterns` | Glob patterns for files to skip |

## Project Structure

```
src/
├── index.ts              # Entry point
├── server.ts             # Express server + webhook routing
├── config/
│   ├── env.ts            # Environment variable loading
│   ├── schema.ts         # Config types and 3-pass defaults
│   └── loader.ts         # Load .ai-reviewer.yml from repo
├── github/
│   ├── app.ts            # GitHub App initialization
│   ├── diff.ts           # Fetch PR files and patches
│   └── comments.ts       # Post review findings to PR
├── reviewers/
│   ├── types.ts          # Reviewer interface (review + analyze)
│   ├── prompt.ts         # Prompt builder (injects analysis context)
│   ├── parse.ts          # Parse Claude response → findings
│   ├── claude.ts         # Claude API client
│   └── registry.ts       # Build reviewer instance
├── pipeline/
│   └── orchestrator.ts   # 3-pass pipeline (analysis → review → verify)
└── utils/
    └── logger.ts         # Structured logging (pino)
```

## Deployment

```bash
docker build -t ai-code-reviewer .
docker run -p 3000:3000 --env-file .env ai-code-reviewer
```
