<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import * as Card from '$shadcn/ui/card/index.js';

  import DetectorSetup from './ui/DetectorSetup.svelte';

  let {
    distance = $bindable(),
    beamCenter = $bindable(),
    short = false,
  }: ComponentProps<typeof DetectorSetup> & { short?: boolean } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Detector Configuration</Card.Title>
    <Card.Description hidden={short}>
      Select detector type and configure module positions.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <DetectorSetup bind:distance bind:beamCenter />
  </Card.Content>
</Card.Root>
