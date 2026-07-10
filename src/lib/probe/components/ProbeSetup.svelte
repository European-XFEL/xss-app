<script lang="ts">
  import type { XRayProbe } from '../types';

  import * as Field from '$shadcn/ui/field';

  import { formatSigFigs } from '$lib/shared/format';
  import { NumSlider, RevealableValue } from '$lib/shared/ui';

  type Props = {
    probe: XRayProbe;
  };

  let { probe = $bindable() }: Props = $props();

  // Display-only readout: E[keV] = 12.398 / wavelength[Å]. Not an editable
  // field — a two-way keV<->Å control is a separate product decision.
  let photonEnergyKev = $derived(12.398 / probe.wavelength);
</script>

<Field.Set>
  <Field.Group>
    <Field.Field orientation="responsive">
      <NumSlider
        label="X-Ray Wavelength (Å)"
        bind:value={probe.wavelength}
        min="0.1"
        max="2.0"
        step="0.01"
      />
      <p class="text-xs text-muted-foreground">
        ≈ <RevealableValue
          display={formatSigFigs(photonEnergyKev)}
          full={`${photonEnergyKev}`}
        /> keV
      </p>
    </Field.Field>
  </Field.Group>
</Field.Set>
