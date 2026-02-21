# North Orchestrator

Multi-agent orchestration service for the North Finance App. Receives Telegram commands, runs bounded 6-agent meetings, stores memory in Supabase (pgvector), and creates structured GitHub issues.

> Does **not** run code — GitHub Actions handles CI/CD.

---

## Architecture

```
Telegram → North Orchestrator → GitHub Issues
                              → Supabase (meeting_logs + pgvector memory)
```

**Agents:** Architect → PM → Mobile Engineer → Backend Engineer → QA → Security → Synthesis

---

## Setup

### 1. Clone and install
```bash
cd north-orchestrator
npm install
cp .env.example .env
# Fill in all values in .env
```

### 2. Run Supabase migration
In your Supabase SQL Editor, run:
```sql
-- paste contents of supabase/migrations/001_init.sql
```
Or use the Supabase CLI:
```bash
supabase db push
```

### 3. Local development
```bash
npm run dev
```
Bot runs in **polling** mode (no WEBHOOK_URL needed).

---

## Deploy to Railway

### 1. Create Railway project
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### 2. Set environment variables
In Railway dashboard → your service → Variables, add all env vars from `.env.example`.

### 3. Set webhook URL
Set `WEBHOOK_URL` to your Railway public URL (e.g. `https://north-orchestrator.up.railway.app`).

Railway will auto-deploy on every push to main.

---

## Telegram Commands

| Command | Description |
|---|---|
| `SAFE: <text>` | Safety/compliance review |
| `BUILD: <text>` | Feature build request |
| `BUG: <text>` | Bug fix request |
| `/status` | Last GitHub issue status |
| `/memory search <query>` | Semantic search project memory |

---

## Connecting to GitHub Actions

The orchestrator creates issues with label `plan:needed`. Your existing GitHub Actions workflows can trigger on this label:

```yaml
# In finance-quest/.github/workflows/agent-dispatch.yml
on:
  issues:
    types: [labeled]

jobs:
  handle-plan:
    if: github.event.label.name == 'plan:needed'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger build
        run: echo "Plan received for issue ${{ github.event.issue.number }}"
```

When the orchestrator posts the plan, it swaps `plan:needed` → `plan:ready`, which can trigger a separate CI job.

---

## Cost Controls

- **Per-agent token cap**: 600–1200 tokens depending on role
- **Hard meeting budget**: 25,000 tokens total
- **Synthesis passes**: Max 2 (aborts with partial output if exceeded)
- All usage logged to Railway console and `meeting_logs` table

---

## Schema

### `meeting_logs`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `issue_number` | int | GitHub issue number |
| `agent_role` | text | e.g. `Architect`, `QA` |
| `output` | text | Agent's raw response |
| `tokens_used` | int | Tokens consumed |
| `created_at` | timestamptz | Timestamp |

### `project_memory`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `summary` | text | Human-readable summary |
| `embedding` | vector(1536) | OpenAI embedding |
| `source_issue` | int | GitHub issue number |
| `created_at` | timestamptz | Timestamp |
