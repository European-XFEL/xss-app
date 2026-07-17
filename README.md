# xss-app

Interactive simulation of time-resolved X-ray solution scattering (XSS) for
pump–probe experiments: configure sample, pump/probe, and detector, and explore
the resulting difference scattering ΔS(q). Built with SvelteKit / Svelte 5.

All scattering compute (Debye I(q)) runs client-side — a TypeScript kernel in a
web worker. There is no compute backend; the Python code under `backend/` is a
parity oracle for tests/codegen only and is never needed to build, serve, or
run the app.

## Build targets

The app builds for one of two targets, selected by `PUBLIC_TARGET`:

| Target | Adapter | Output | Storage |
|---|---|---|---|
| `node` (default) | adapter-node | `build/` | Postgres, with a runtime per-user toggle (Settings) to keep uploads/results in the browser instead |
| `static` | adapter-static | `build-static/` | fully backendless: IndexedDB in the browser, no server or DB at runtime |

## Development

Requires Node + pnpm, and Docker for the node-target Postgres.

```sh
cp .env.example .env   # fill in DB credentials at minimum
pnpm install
pnpm db:start          # Postgres 17 via docker compose (port 5432)
pnpm db:push           # first run: apply schema
pnpm db:seed           # first run: seed example molecules/solvents
pnpm dev
```

Vite picks the first free port from 5173 — use the printed URL.
`curl -sf localhost:<port>/health` returns 200 once the server and DB are up.

Checks: `pnpm test` (vitest), `pnpm check` (svelte-check), `pnpm lint`,
`pnpm bench` (Debye kernel benchmark), `pnpm storybook`.

## Build & preview

```sh
pnpm build             # node target
pnpm preview

pnpm build:static      # static target
pnpm preview:static
```

All scripts read `.env` via dotenv; the `:static` variants pin the static
target, the `/xss-app` base path, and full prerendering
(`PUBLIC_PRERENDER_ALL=true`) inline, so no separate env file is needed.

## Serve / deploy

**Node target** — `pnpm serve` runs `node build/index.js`. `ORIGIN` must be set
to the public origin (adapter-node reconstructs request URLs from it; without
it, upload/form POSTs fail the same-origin check with a 403). Or use the
containerised flow — compose services are profile-gated:

```sh
docker compose up db               # just the database
docker compose --profile prod up   # build + serve on :8000 under /xss-app
docker compose --profile dev up    # containerised dev server (:5173, file sync)
docker compose --profile preview up
```

**Static target** — the `build-static/` output is plain files built under the
`/xss-app` base path; host them anywhere that serves that prefix.
`pnpm serve:static` serves it locally with Caddy on :8080
(`scripts/static.Caddyfile`).
