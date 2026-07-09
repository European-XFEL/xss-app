<script lang="ts">
  import type { Sample } from '../types';

  import * as Table from '$shadcn/ui/table/index.js';

  import { ChannelPanel } from '$lib/shared/ui';

  interface Props {
    solvent: Sample['solvent'];
  }

  let { solvent }: Props = $props();

  const rows = $derived.by(() => {
    // if (!solvent) return;
    return [
      ['ρ<sub>m</sub>', 'mol/m<sup>3</sup>', solvent?.rhom.toPrecision(5)],
      ['Cpm', 'J/mol/K', solvent?.cpm.toPrecision(3)],
      ['Q Min', 'Å<sup>-1</sup>', solvent?.qMin.toPrecision(3)],
      ['Q Max', 'Å<sup>-1</sup>', solvent?.qMax.toPrecision(3)],
      ['Q Step', 'Å<sup>-1</sup>', solvent?.qStep.toPrecision(3)],
    ];
  });
</script>

<!-- TODO: Add reference link to where solvent files downloaded from  -->

<ChannelPanel
  label="Solvent Properties"
  description="Summary of solvent information."
  class="max-w-md"
>
  <Table.Root>
    <Table.Body>
      {#each rows as [key, unit, value] (key)}
        <Table.Row>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <Table.Cell class="font-medium">{@html key}</Table.Cell>
          <Table.Cell>{value}</Table.Cell>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <Table.Cell class="text-end">{@html unit}</Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</ChannelPanel>
