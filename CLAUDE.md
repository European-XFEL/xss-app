# Project agent guide

Instructions for AI coding agents (Claude Code and compatible tools) working in this
repository. Deliberately concise — this file loads into every session.

## Svelte MCP server (required for Svelte work)

Use the Svelte MCP server whenever writing or changing Svelte / SvelteKit code:

- `list-sections` FIRST to discover available docs, then `get-documentation` for the
  relevant sections — analyze each section's `use_cases` and fetch ALL that apply to the task.
- `svelte-autofixer`: run it on any Svelte code you write and keep calling it until it
  returns no issues or suggestions, BEFORE presenting the code.
- `playground-link`: only after the user confirms, and never for code already written to files.

## Code intelligence

This repo is indexed by CodeGraph (`.codegraph/` exists). Prefer `codegraph_explore` /
`codegraph_node` (MCP), or the `codegraph` CLI, over ad-hoc grep/read to locate and
understand code.

## Dev workflow (git worktrees)

Worktree setup is automated by `.claude/settings.json` (`worktree`) + `.worktreeinclude`:
new worktrees branch from your current HEAD, symlink `node_modules`, and receive a copy of
`.env` — so no per-worktree `pnpm install` or env-copying is needed. The orchestrator only
needs to tell you whether the shared services are already running.

- Shared singletons: one Postgres and one gRPC backend serve every worktree. Your worktree
  runs ONLY its own Vite dev server against them — do not start your own DB/backend.
- Start the dev server with the app env loaded (bare `vite dev` does not populate
  `process.env`, so SvelteKit's `$env/dynamic/private` 500s on DB routes):
  `pnpm exec dotenv -e .env -- vite dev`
- Vite auto-selects a free port (5173+). Read the printed port — that is your URL.
- Readiness: `curl -sf localhost:$PORT/health` returns 200 once the server + DB init are OK.
- View changes with /chrome at `http://localhost:$PORT` (each agent gets its own tab group).
- Never `git stash` (shared across worktrees) and do not `git push` — both are also blocked
  by `.claude/settings.json`.

## Commits

Single-line conventional commits, enforced by the `commit-msg` hook:

- Format: `type(scope): subject` — lowercase, imperative, no trailing period, <=72 chars.
- Types: `feat` `fix` `refactor` `chore` `build` `style` `docs` `test` `lint` `revert`.
- Scope is the area touched, matching existing usage: `detector`, `dashboard`, `db`,
  `backend`, `sample`, `molecule`, `pump`, `ui`, `hero`, `proto`, `deps`, `docker`, `config`,
  `shared`, `contracts`, `types`, `app` — nest with `/` for precision (e.g. `molecule/table`).
  Omit the scope only for genuinely cross-cutting changes.
- NO body, NO `Co-Authored-By` or other trailers. Keep commits small and single-concern;
  split bundled changes into separate commits.

The "why" that would normally be a commit body lives in a git note in the `refs/notes/agents`
namespace as JSON. In Claude Code sessions the `post-commit` hook auto-attaches a skeleton
note; fill in its `body` field with the rationale:

```
git notes --ref=agents edit HEAD
```

Do not set `reviewed` to `true` — a human reviewer flips that flag. Notes follow amends/rebases
and display in `git log`; they are NOT pushed by default — do not push `refs/notes/agents`
unless explicitly asked.
