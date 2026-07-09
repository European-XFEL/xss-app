<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { ChannelPanel } from '$lib/shared/ui';

  import PumpSetup from './PumpSetup.svelte';

  let {
    pump = $bindable(),
    short = false,
  }: ComponentProps<typeof PumpSetup> & { short?: boolean } = $props();
</script>

<ChannelPanel
  label="Optical Pump"
  description={short
    ? undefined
    : 'Configure the optical pump settings for the simulation.'}
>
  <PumpSetup bind:pump />
</ChannelPanel>
