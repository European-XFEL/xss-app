<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ProbeSetupCard from './ProbeSetupCard.svelte';

  const { Story } = defineMeta({
    title: 'probe/ProbeSetupCard',
    component: ProbeSetupCard,
    args: {
      probe: { wavelength: 1.0 },
    },
  });
</script>

<Story name="Card" />

<Story name="Short" args={{ short: true }} />
