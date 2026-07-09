<script lang="ts">
  import { formatState } from '../../../types';

  import { Badge } from '$shadcn/ui/badge';

  type Props = {
    state: number;
  };

  let { state }: Props = $props();
</script>

{#if state === 0}
  <Badge variant="outline" class="border-data-total text-data-total">
    {formatState(state)}
  </Badge>
{:else}
  <Badge class="bg-data-solute text-white">
    {formatState(state)}
  </Badge>
{/if}
