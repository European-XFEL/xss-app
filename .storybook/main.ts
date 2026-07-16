import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.svelte'],
  addons: ['@storybook/addon-svelte-csf'],
  framework: {
    name: '@storybook/sveltekit',
    options: {},
  },
  async viteFinal(viteConfig) {
    const dropPlugin = (p: unknown): boolean =>
      typeof p === 'object' &&
      p !== null &&
      'name' in p &&
      typeof p.name === 'string' &&
      /sentry|visualizer/i.test(p.name);

    const filterPlugins = (plugins: unknown): unknown =>
      Array.isArray(plugins)
        ? plugins.map(filterPlugins).filter((p) => !dropPlugin(p))
        : plugins;

    viteConfig.plugins = filterPlugins(
      viteConfig.plugins,
    ) as typeof viteConfig.plugins;

    // Swap `$lib/molecule/molecule.remote` for a browser-safe mock module —
    // the real remote-functions file can't compile under Storybook (the
    // sveltekit framework preset disables kit's compile plugin). sb.mock()
    // can't do this (its registration is alias-blind), and a resolve.alias
    // entry can't either (Vite's mergeAlias gives later-merged kit/plugin
    // aliases priority over user entries, so kit's `$lib` prefix always
    // rewrites first). Instead match what actually reaches resolveId AFTER
    // the alias rewrite: the absolute real path of molecule.remote.
    // NOTE: the mock's filename must NOT match `*.remote.*` — SvelteKit's
    // remote-functions transform is filename-triggered and still runs under
    // the storybook preset, replacing any matching module with an empty
    // `__sveltekit/remote` shell (no named exports).
    const moleculeRemoteMock = fileURLToPath(
      new URL('./mocks/molecule-remote-mock.js', import.meta.url),
    );
    viteConfig.plugins ??= [];
    viteConfig.plugins.push({
      name: 'mock-molecule-remote',
      enforce: 'pre',
      resolveId(source: string) {
        if (
          source === '$lib/molecule/molecule.remote' ||
          /src\/lib\/molecule\/molecule\.remote(\.ts)?$/.test(source)
        ) {
          return moleculeRemoteMock;
        }
      },
    });

    return viteConfig;
  },
};

export default config;
