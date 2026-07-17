import { execSync } from 'node:child_process';
import process from 'node:process';

import adapter_node from '@sveltejs/adapter-node';
import adapter_static from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const TARGET = process.env.PUBLIC_TARGET;
// Two targets: `static` (backendless — client-side Debye compute + IndexedDB
// storage, prerendered via adapter-static) and `node` (SSR server; storage is a
// runtime Postgres/IndexedDB toggle). Only `node` runs a server.
const STATIC = TARGET === 'static';

function gitVersion() {
  try {
    const gv = execSync('git describe --tags --always --dirty --long', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return `${TARGET}-${gv}`;
  } catch (err) {
    console.log(err);
    return process.env.PUBLIC_APP_VERSION ?? undefined;
  }
}

const VERSION = gitVersion();

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [vitePreprocess()],
  compilerOptions: {
    experimental: {
      // Required (app-wide) by kit.experimental.remoteFunctions.
      async: true,
    },
  },
  kit: {
    paths: {
      base: process.env.PUBLIC_BASE_PATH,
    },
    alias: {
      $css: './src/app.css',
      $components: './src/components',
      $shadcn: './src/lib/shadcn/components',
    },
    csrf: {
      trustedOrigins: [
        'https://exfldadev01.desy.de',
        'https://european-xfel.github.io',
      ],
    },
    version: { name: VERSION },
    experimental: {
      // Explicit env var declarations (src/env.ts) — default in SvelteKit 3,
      // replaces the implicit $env/* modules with $app/env/{private,public}.
      explicitEnvironmentVariables: true,
      // Remote functions (*.remote.ts) — used for the molecule upload form.
      // Requires compilerOptions.experimental.async below.
      remoteFunctions: true,
    },
    outDir: STATIC ? '.svelte-kit-static' : '.svelte-kit',
  },
  extensions: ['.svelte', '.svx'],
};

const config_node = {
  ...config,
  kit: {
    ...config.kit,
    adapter: adapter_node(),
    prerender: {
      entries: ['/', '/docs', '/experiment/detector', '/experiment/pump-probe'],
    },
  },
};

const config_static = {
  ...config,
  kit: {
    ...config.kit,
    adapter: adapter_static({
      pages: 'build-static',
      strict: false,
    }),
  },
};

/**
 * Export the selected config. Defaults to `config_node` when nothing is set.
 * The `static` target uses adapter-static; `node` runs a server.
 */
const selectedConfig = STATIC ? config_static : config_node;

console.log(`Target: ${TARGET}, Version: ${VERSION}`);

export default selectedConfig;
