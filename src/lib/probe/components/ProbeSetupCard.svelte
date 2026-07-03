<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { CardWrapper } from '$lib/shared/ui';

  import ProbeSetup from './ProbeSetup.svelte';

  let { probe = $bindable(), short }: ComponentProps<typeof ProbeSetup> =
    $props();
</script>

<CardWrapper>
  <ProbeSetup bind:probe {short} />
</CardWrapper>
