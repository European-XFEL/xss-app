<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Placeholder from './Placeholder.svelte';

  const { Story } = defineMeta({
    title: 'shared/ui/Placeholder',
    component: Placeholder,
    args: {
      title: 'No data yet',
      description: 'Run the simulation to see results here.',
    },
  });
</script>

<Story name="Default" />
