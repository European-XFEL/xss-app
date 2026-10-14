<script lang="ts">
  import type { Sample, Solvents } from '../types';

  import { NumSlider } from '$lib/shared/ui';

  import SolventSelect from './ui/SolventSelect.svelte';

  interface Props {
    solvent: Sample['solvent'];
    concentrationSoluteMmol: Sample['concentrationSoluteMmol'];
    solvents: Solvents;
    loading?: boolean;
  }

  let {
    solvent = $bindable(),
    concentrationSoluteMmol = $bindable(),
    solvents,
    loading = false,
  }: Props = $props();
</script>

<div class="py-3 first:pt-0 last:pb-0">
  <SolventSelect bind:solvent {solvents} {loading} />
</div>
<div class="py-3 first:pt-0 last:pb-0">
  <NumSlider
    label="Solute Concentration (mMol/L)"
    min="1"
    max="100000"
    step="1"
    logarithmic
    bind:value={concentrationSoluteMmol}
  />
</div>
