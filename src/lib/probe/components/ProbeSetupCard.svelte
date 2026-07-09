<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import * as Card from '$shadcn/ui/card/index.js';

  import ProbeSetup from './ProbeSetup.svelte';

  let {
    probe = $bindable(),
    short = false,
  }: ComponentProps<typeof ProbeSetup> & { short?: boolean } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>X-Ray Probe Configuration</Card.Title>
    <Card.Description hidden={short}>
      Configure the X-ray probe wavelength settings.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <ProbeSetup bind:probe />
  </Card.Content>
</Card.Root>
