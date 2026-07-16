import { URL, fileURLToPath } from 'node:url';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  // src/lib/server/grpc/gen is protoc-generated (protoc-gen-es); lint rules
  // don't apply to code we don't hand-edit.
  { ignores: ['stories/**', 'src/lib/shadcn/**', 'src/lib/server/grpc/gen/**'] },
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  prettier,
  svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // typescript-eslint recommends disabling no-undef on TypeScript projects:
      // https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      complexity: ['warn', 10],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 4],
      'max-lines-per-function': ['warn', 50],
      'max-statements': ['warn', 20],
      'max-nested-callbacks': ['warn', 3],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig,
      },
    },
  },
  {
    files: ['src/**/*.{ts,js,svelte}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
      'boundaries/elements': [
        // Order matters: first match wins, so list more specific patterns first.
        // contracts = the sanctioned client/server type-crossing surface.
        {
          type: 'contracts',
          pattern: 'src/lib/shared/(contracts|health).ts',
          mode: 'full',
        },
        // SvelteKit remote functions: server-side handlers that compile to
        // typed fetch wrappers on the client — a sanctioned crossing surface.
        { type: 'remote', pattern: 'src/**/*.remote.ts', mode: 'full' },
        { type: 'shared', pattern: 'src/lib/shared', mode: 'folder' },
        { type: 'shared', pattern: 'src/lib/shadcn', mode: 'folder' },
        {
          type: 'feature',
          pattern: 'src/lib/(detector|molecule|probe|pump|sample|simulation)',
          mode: 'folder',
          capture: ['feature'],
        },
        {
          type: 'widget',
          pattern: 'src/lib/widgets/*',
          mode: 'folder',
          capture: ['widget'],
        },
        { type: 'app', pattern: 'src/lib/app', mode: 'folder' },
        // SvelteKit server-side route/hook files may reach into lib/server.
        {
          type: 'server-route',
          pattern: 'src/routes/**/+server.ts',
          mode: 'full',
        },
        {
          type: 'server-route',
          pattern: 'src/routes/**/*.server.ts',
          mode: 'full',
        },
        { type: 'server-route', pattern: 'src/hooks.server.ts', mode: 'full' },
        { type: 'app', pattern: 'src/routes', mode: 'folder' },
        { type: 'server', pattern: 'src/lib/server', mode: 'folder' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // contracts is the single sanctioned crossing point for
            // proto-derived types: it may type-import from the server tree.
            {
              from: { type: 'contracts' },
              allow: { to: { type: ['server'] }, dependency: { kind: 'type' } },
            },
            {
              from: { type: 'shared' },
              allow: { to: { type: ['shared', 'contracts'] } },
            },
            {
              from: { type: 'feature' },
              allow: {
                to: [
                  { type: 'shared' },
                  { type: 'contracts' },
                  { type: 'remote' },
                  { type: 'feature', captured: { feature: '{{ feature }}' } },
                ],
              },
            },
            // Remote function files run on the server (clients only see the
            // generated fetch wrappers), so they may reach into lib/server.
            {
              from: { type: 'remote' },
              allow: { to: { type: ['server', 'shared', 'contracts'] } },
            },
            // Cross-feature *type* imports are tolerated for now (erased at
            // compile time). Value imports between features stay banned.
            {
              from: { type: 'feature' },
              allow: { to: { type: 'feature' }, dependency: { kind: 'type' } },
            },
            {
              from: { type: 'widget' },
              allow: {
                to: {
                  type: ['shared', 'contracts', 'remote', 'feature', 'widget'],
                },
              },
            },
            {
              from: { type: 'app' },
              allow: {
                to: {
                  type: [
                    'shared',
                    'contracts',
                    'remote',
                    'feature',
                    'widget',
                    'app',
                  ],
                },
              },
            },
            {
              from: { type: 'server-route' },
              allow: {
                to: {
                  type: [
                    'server',
                    'shared',
                    'contracts',
                    'feature',
                    'widget',
                    'app',
                  ],
                },
              },
            },
            {
              from: { type: 'server' },
              allow: { to: { type: ['server', 'contracts'] } },
            },
            // Entry-point enforcement: features and widgets are consumed only
            // via their public index.ts; deep imports are banned regardless of
            // the allow rules above (last matching rule wins).
            {
              from: { type: '*' },
              disallow: {
                to: { type: ['feature', 'widget'], internalPath: '!index.ts' },
              },
              message:
                'Import features and widgets through their public index.ts, not internal files',
            },
          ],
        },
      ],
    },
  },
);
