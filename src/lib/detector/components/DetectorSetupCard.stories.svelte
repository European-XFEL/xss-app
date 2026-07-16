<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import DetectorSetupCard from './DetectorSetupCard.svelte';

  const { Story } = defineMeta({
    title: 'detector/DetectorSetupCard',
    component: DetectorSetupCard,
    args: {
      distance: 250,
      beamCenter: { x: 512, y: 512 },
    },
  });
</script>

<Story name="Card" />

<Story name="Short" args={{ short: true }} />
