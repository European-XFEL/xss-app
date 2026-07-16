<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import PumpSetupCard from './PumpSetupCard.svelte';

  const { Story } = defineMeta({
    title: 'pump/PumpSetupCard',
    component: PumpSetupCard,
    args: {
      pump: {
        photonEnergyEv: 2.5,
        excitedStateEnergyEv: 1.0,
        excitedStateFraction: 0.2,
      },
    },
  });
</script>

<Story name="Card" />

<Story name="Short" args={{ short: true }} />
