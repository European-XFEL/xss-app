<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { ChannelPanel } from '$lib/shared/ui';

  import DetectorInfo from './ui/DetectorInfo.svelte';

  type Props = ComponentProps<typeof DetectorInfo>;

  let { ...restProps }: Props = $props();
</script>

<ChannelPanel
  label="Detector Information"
  description="Information about the selected detector and current configuration."
>
  <DetectorInfo {...restProps} />
</ChannelPanel>
