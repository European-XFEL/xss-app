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

    viteConfig.plugins = filterPlugins(viteConfig.plugins) as typeof viteConfig.plugins;
    return viteConfig;
  },
};

export default config;
