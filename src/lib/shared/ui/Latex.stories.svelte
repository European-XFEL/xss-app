<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Latex from './Latex.svelte';

  const { Story } = defineMeta({
    title: 'shared/ui/Latex',
    component: Latex,
    args: {
      math: 'q = \\frac{4\\pi \\sin\\theta}{\\lambda}',
    },
  });
</script>

<Story name="Inline" />

<Story name="Display" args={{ displayMode: true }} />
