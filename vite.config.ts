import { sentrySvelteKit } from '@sentry/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { visualizer } from 'rollup-plugin-visualizer';
import devtoolsJson from 'vite-plugin-devtools-json';
import lucidePreprocess from 'vite-plugin-lucide-preprocess';
import { defineConfig } from 'vitest/config';

import { sveltekit } from '@sveltejs/kit/vite';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': isProd ? '"production"' : '"development"',
  },
  plugins: [
    isProd ? devtoolsJson() : null,
    lucidePreprocess(),
    tailwindcss(),
    sentrySvelteKit({
      // Source-map upload needs SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN;
      // skip it (and its per-build warning) when no token is configured.
      autoUploadSourceMaps: Boolean(process.env.SENTRY_AUTH_TOKEN),
    }),
    sveltekit(),
    visualizer({
      emitFile: true,
      filename: 'stats.html',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  ],
  server: {
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.svelte-kit/**',
        '**/.svelte-kit-static/**',
        '**/build/**',
        '**/build-static/**',
        '**/backend/**',
      ],
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.{test,spec}.ts'],
          exclude: ['src/**/*.browser.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          setupFiles: ['vitest-browser-svelte'],
          include: ['src/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
