<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import * as Card from '$shadcn/ui/card/index.js';

  import PumpSetup from './PumpSetup.svelte';

  let {
    pump = $bindable(),
    short = false,
  }: ComponentProps<typeof PumpSetup> & { short?: boolean } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Optical Pump Configuration</Card.Title>
    <Card.Description hidden={short}>
      Configure the optical pump settings for the simulation.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <PumpSetup bind:pump />
  </Card.Content>
</Card.Root>
