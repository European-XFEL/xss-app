<script lang="ts">
  import type { Sample } from '../types';

  import * as Table from '$shadcn/ui/table/index.js';

  import { formatSigFigs } from '$lib/shared/format';
  import { ChannelPanel, RevealableValue } from '$lib/shared/ui';

  interface Props {
    solvent: Sample['solvent'];
  }

  let { solvent }: Props = $props();

  /** One display row: 3-sig-fig text plus the full-precision text for the
   * reveal-on-focus overlay ('' while no solvent is selected — nothing to
   * reveal). */
  function row(label: string, unit: string, value: number | undefined) {
    return [
      label,
      unit,
      formatSigFigs(value),
      value == null ? '' : `${value}`,
    ] as const;
  }

  // 3 significant figures everywhere, matching the app-wide display
  // convention (rhom previously stood out at 5 sig figs). Full precision
  // stays reachable via RevealableValue.
  const rows = $derived.by(() => [
    row('ρ<sub>m</sub>', 'mol/m<sup>3</sup>', solvent?.rhom),
    row('Cpm', 'J/mol/K', solvent?.cpm),
    row('Q Min', 'Å<sup>-1</sup>', solvent?.qMin),
    row('Q Max', 'Å<sup>-1</sup>', solvent?.qMax),
    row('Q Step', 'Å<sup>-1</sup>', solvent?.qStep),
  ]);
</script>

<ChannelPanel
  label="Solvent Properties"
  description="Summary of solvent information."
  class="max-w-md"
>
  <Table.Root>
    <Table.Body>
      {#each rows as [key, unit, display, fullValue] (key)}
        <Table.Row>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <Table.Cell class="font-medium">{@html key}</Table.Cell>
          <Table.Cell>
            {#if fullValue}
              <RevealableValue display={display ?? '—'} full={fullValue} />
            {:else}
              {display}
            {/if}
          </Table.Cell>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <Table.Cell class="text-end">{@html unit}</Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
  <a
    href="https://sites.google.com/site/trwaxs/home/TRWAXS-data"
    target="_blank"
    rel="noopener noreferrer"
    class="mt-2 block text-xs text-muted-foreground hover:underline"
  >
    Source: TR-WAXS data
  </a>
</ChannelPanel>
