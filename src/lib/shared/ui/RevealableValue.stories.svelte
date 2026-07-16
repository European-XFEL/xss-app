<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import RevealableValue from './RevealableValue.svelte';

  const { Story } = defineMeta({
    title: 'shared/ui/RevealableValue',
    component: RevealableValue,
    args: {
      display: '3.14',
      full: '3.14159265358979',
    },
  });
</script>

<Story name="Default" />
