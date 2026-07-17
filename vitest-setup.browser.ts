// In the browser, `$app/env/public` compiles to a module-load read of
// `globalThis.__sveltekit_dev.env`, which SvelteKit's client bootstrap
// normally sets. Vitest's browser page has no kit bootstrap, so seed it —
// empty env matches the dev default (PUBLIC_TARGET unset = node target).
(globalThis as { __sveltekit_dev?: object }).__sveltekit_dev = { env: {} };
