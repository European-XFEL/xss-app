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

## shadcn-svelte customizations

`shadcn-svelte add <component> --overwrite` fully replaces the local file with upstream's
current registry code — it does not merge, and it will silently delete any local edits.
Before running it on any component below, re-apply the customization afterward (check
`git diff` against the list, don't just skim for obviously-broken output):

- `sidebar.svelte` — the "sidebar" variant's `sidebar-container` must stay in normal document
  flow (not `fixed`); upstream now hardcodes `fixed` for every variant. The `relative h-full`
  override lives at the call site (`src/lib/widgets/nav/components/Sidebar.svelte`, documented
  inline there), but the outer wrapper's `md:flex md:h-full md:flex-col` for non-floating/inset
  variants has no prop hook and must be hand-patched back into this file directly.
- `card.svelte` — keep `ring-inset` on the root (upstream mira ships `ring-1` without it).
- `input.svelte`, `select-trigger.svelte` — keep `border-line` (this app's border token, set in
  `src/app.css`); upstream uses stock `border-input`.
- `slider.svelte` — keep `bg-line` on the track span (upstream ships `bg-muted`, which matches
  the card surface in dark mode and makes the inactive track invisible). The track's classes
  are hardcoded — the `class` prop only reaches the root — so this must be hand-patched.

When a component's `class` prop is forwarded to the element you need to change (check by
reading the file), prefer overriding at the call site over editing the vendored file — that
survives `--overwrite` for free. Only hand-patch the vendored file when no prop reaches the
element in question, as with the sidebar's outer wrapper above.

## Dev workflow (git worktrees)

Worktree setup is partly automated by `.claude/settings.json` (`worktree`) + `.worktreeinclude`:
new worktrees branch from your current HEAD and receive a copy of `.env`. Each worktree gets
its OWN independent `node_modules` (they are no longer symlinked to a shared store), so run
`pnpm install` once after entering a fresh worktree — it takes a few seconds and carries no
shared-store hazard. Because the modules are real (not symlinked out of the main checkout),
`/chrome` browser verification works without any Vite `server.fs.allow` workaround.

- Shared Postgres: one Postgres serves every worktree; your worktree runs ONLY its own Vite
  dev server against it — do not start your own DB. Debye compute runs entirely client-side
  in the browser (the TS kernel). The Python calculator (`backend/calculator.py`) is a
  parity/codegen oracle ONLY — it has no runtime role (the gRPC serving layer was retired) and
  is never needed for normal dev.
- Start the dev server with `pnpm dev`. The `dev` / `build*` / `preview*` scripts already wrap
  `dotenv -e .env`, so `process.env` is populated and DB routes work — no manual `dotenv`
  invocation needed.
- Vite auto-selects a free port (5173+). Read the printed port — that is your URL.
- Readiness: `curl -sf localhost:$PORT/health` returns 200 once the server + DB init are OK.
- View changes with /chrome at `http://localhost:$PORT` (each agent gets its own tab group).
- Never `git stash` (shared across worktrees) and do not `git push` — both are also blocked
  by `.claude/settings.json`.

## Initial development phase: no compatibility burden

The app is in initial development. Do NOT preserve behaviour or backwards compatibility across
changes: no migration shims, no legacy-format fallbacks, no keeping old share links, URL
formats, stored data or persisted state decodable. Change formats freely (e.g. bump or replace
the share payload in `simulation-url.ts`) and delete the old path instead of supporting both.
Revisit this rule once the app has a first public release.

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

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.
<!-- END BEADS CODEX SETUP -->

## Multi-agent orchestration

When orchestrating subagents (Agent tool) across related beads:

- Reuse an existing subagent (`SendMessage` to its name) for a related follow-on bead
  instead of spawning a fresh one — it already carries relevant context. Spawn a new
  agent only when the task needs different scope, or the existing agent's context is
  getting full (~75%+).
- Claim a bead before dispatching its agent (`bd update <id> --claim`), and set
  `--assignee` to the subagent's name for traceability.
- Use `needs-review` / `blocked` labels (`bd label`) rather than prose notes when a bead
  needs human attention — queryable later via `bd list --label`.
- `bd merge-slot acquire/release` serializes concurrent committers when multiple agents
  commit independently. Not needed when a single orchestrator performs all commits on
  the agents' behalf (no concurrent-writer race to arbitrate).
