<script lang="ts">
  import type { Shape } from '../../types';

  import * as Field from '$shadcn/ui/field/index.js';
  import { Input } from '$shadcn/ui/input/index.js';

  import type { QRange } from '$lib/shared/contracts';
  import { formatSigFigs } from '$lib/shared/format';

  type Props = {
    imageShape: Shape;
    pixelSize: number;
    qRange: QRange;
  };

  let { imageShape, pixelSize, qRange }: Props = $props();

  // Match the significant-figure formatting used for the solvent Q range on
  // the Sample page rather than dumping raw floats like 0.11224946440748564.
  // Full precision stays reachable: focusing a field swaps its displayed
  // value to the untruncated number and selects it for copying.
  let qFields = $derived([
    {
      label: 'Q Min',
      display: formatSigFigs(qRange.min),
      full: `${qRange.min}`,
    },
    {
      label: 'Q Max',
      display: formatSigFigs(qRange.max),
      full: `${qRange.max}`,
    },
    {
      label: 'Q Step',
      display: formatSigFigs(qRange.step),
      full: `${qRange.step}`,
    },
  ]);

  let revealedLabel: string | null = $state(null);

  function reveal(label: string, event: FocusEvent) {
    revealedLabel = label;
    (event.currentTarget as HTMLInputElement).select();
  }

  function unreveal() {
    revealedLabel = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      (event.currentTarget as HTMLInputElement).blur();
    }
  }
</script>

<Field.Set>
  <Field.Group class="flex flex-row">
    <Field.Field>
      <Field.Label>Pixel size (mm)</Field.Label>
      <Input value={pixelSize} disabled={true} />
    </Field.Field>

    <Field.Field>
      <Field.Label>Image shape (px)</Field.Label>
      <div class="grid grid-cols-2 gap-4">
        <Input value={imageShape.width} disabled={true} />
        <Input value={imageShape.height} disabled={true} />
      </div>
    </Field.Field>
  </Field.Group>

  <Field.Separator />

  <Field.Set>
    <Field.Legend>Q Range (Å⁻¹)</Field.Legend>
    <Field.Description>
      Computed from the current detector configuration. Note that this is
      <span class="font-bold">not</span> the range used by the simulation.
    </Field.Description>
    <Field.Group class="flex flex-row">
      {#each qFields as { label, display, full } (label)}
        <Field.Field>
          <Field.Label>{label}</Field.Label>
          <Input
            value={revealedLabel === label ? full : display}
            readonly
            title={full}
            class="truncate opacity-50 focus-visible:opacity-100"
            onfocus={(event) => reveal(label, event)}
            onblur={unreveal}
            onkeydown={handleKeydown}
          />
        </Field.Field>
      {/each}
    </Field.Group>
  </Field.Set>
</Field.Set>
