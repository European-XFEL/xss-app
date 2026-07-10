<script lang="ts">
  import { formatSigFigs } from '$lib/shared/format';
  import { RevealableValue } from '$lib/shared/ui';

  import DSSPlot from './DSSPlot.svelte';

  interface Props {
    qValues: number[];
    deltaSi: number[] | null;
    deltaSSoluteScaled: number[] | null;
    deltaSSolvent: number[] | null;
    deltaSSolventPerMolecule: number[] | null;
    deltaTemperatureK: number | undefined;
    depositedEnergyJoule: number | undefined;
    detectorQRange: [number | null, number | null];
  }

  const results: Props = $props();

  const deltaT = $derived(results.deltaTemperatureK);
  const energy = $derived(results.depositedEnergyJoule);
  const [qMin, qMax] = $derived(results.detectorQRange);

  interface Metric {
    label: string;
    display: string;
    unit: string;
    full: string;
  }

  const metrics = $derived<Metric[]>([
    deltaT != null
      ? {
          label: 'ΔT',
          display: formatSigFigs(deltaT),
          unit: 'K',
          full: `${deltaT} K`,
        }
      : { label: 'ΔT', display: '—', unit: 'K', full: '' },
    energy != null
      ? {
          label: 'Deposited Energy',
          display: formatSigFigs(energy),
          unit: 'J',
          full: `${energy} J`,
        }
      : { label: 'Deposited Energy', display: '—', unit: 'J', full: '' },
    qMin != null && qMax != null
      ? {
          label: 'Q range',
          display: `${formatSigFigs(qMin)} – ${formatSigFigs(qMax)}`,
          unit: 'Å⁻¹',
          full: `${qMin} – ${qMax} Å⁻¹`,
        }
      : { label: 'Q range', display: '—', unit: 'Å⁻¹', full: '' },
  ]);
</script>

<div class="divide-y divide-line">
  <div class="flex divide-x divide-line-soft py-3 first:pt-0 last:pb-0">
    {#each metrics as metric (metric.label)}
      <div class="flex-1 px-4 first:pl-0 last:pr-0">
        <div>{metric.label}</div>
        <div class="mt-1 font-mono text-base font-semibold">
          {#if metric.full}
            <RevealableValue display={metric.display} full={metric.full} />
          {:else}
            {metric.display}
          {/if}
          <span class="text-xs font-normal text-muted-foreground">
            {metric.unit}
          </span>
        </div>
      </div>
    {/each}
  </div>

  <div class="py-3 first:pt-0 last:pb-0">
    <DSSPlot {...results} />
  </div>
</div>
