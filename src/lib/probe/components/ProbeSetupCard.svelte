<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { ChannelPanel } from '$lib/shared/ui';

  import ProbeSetup from './ProbeSetup.svelte';

  let {
    probe = $bindable(),
    short = false,
  }: ComponentProps<typeof ProbeSetup> & { short?: boolean } = $props();
</script>

<ChannelPanel
  label="X-Ray Probe"
  description={short
    ? undefined
    : 'Configure the X-ray probe wavelength settings.'}
>
  <ProbeSetup bind:probe />
</ChannelPanel>
