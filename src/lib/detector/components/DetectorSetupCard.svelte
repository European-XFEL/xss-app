<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { ChannelPanel } from '$lib/shared/ui';

  import DetectorSetup from './ui/DetectorSetup.svelte';

  let {
    distance = $bindable(),
    beamCenter = $bindable(),
    short = false,
  }: ComponentProps<typeof DetectorSetup> & { short?: boolean } = $props();
</script>

<ChannelPanel
  label="Detector Configuration"
  description={short
    ? undefined
    : 'Select detector type and configure module positions.'}
>
  <DetectorSetup bind:distance bind:beamCenter />
</ChannelPanel>
