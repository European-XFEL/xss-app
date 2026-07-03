<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { CardWrapper } from '$lib/shared/ui';

  import PumpSetup from './PumpSetup.svelte';

  let { pump = $bindable() }: ComponentProps<typeof PumpSetup> = $props();
</script>

<CardWrapper>
  <PumpSetup bind:pump />
</CardWrapper>
