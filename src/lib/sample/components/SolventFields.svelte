<script lang="ts">
  import type { Sample, Solvents } from '../types';

  import { NumSlider } from '$lib/shared/ui';

  import SolventSelect from './ui/SolventSelect.svelte';

  interface Props {
    solvent: Sample['solvent'];
    concentrationSoluteMolar: Sample['concentrationSoluteMolar'];
    solvents: Solvents;
    loading?: boolean;
  }

  let {
    solvent = $bindable(),
    concentrationSoluteMolar = $bindable(),
    solvents,
    loading = false,
  }: Props = $props();
</script>

<div class="py-3 first:pt-0 last:pb-0">
  <SolventSelect bind:solvent {solvents} {loading} />
</div>
<div class="py-3 first:pt-0 last:pb-0">
  <NumSlider
    label="Solute Concentration (mol/L)"
    min="0.001"
    max="100"
    step="0.001"
    bind:value={concentrationSoluteMolar}
  />
</div>
