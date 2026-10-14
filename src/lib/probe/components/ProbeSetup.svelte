<script lang="ts">
  import { kevToWavelength, wavelengthToKev } from '../energy';

  import * as Field from '$shadcn/ui/field';

  import { NumSlider } from '$lib/shared/ui';

  type Props = {
    probe: { wavelength: number };
  };

  let { probe = $bindable() }: Props = $props();

  // keV is a view of the stored wavelength (Å), which is what the URL carries.
  // Display is rounded. Input outside the slider range is ignored rather than
  // clamped, so a partial entry ("1" on the way to "10") doesn't rewrite the
  // field mid-typing.
  const WAVELENGTH_MIN = 0.1;
  const WAVELENGTH_MAX = 2.0;

  function setEnergyKev(next: number | string | null) {
    if (next === '' || next == null) return;
    const kev = Number(next);
    if (
      kev >= wavelengthToKev(WAVELENGTH_MAX) &&
      kev <= wavelengthToKev(WAVELENGTH_MIN)
    ) {
      probe.wavelength = kevToWavelength(kev);
    }
  }
</script>

<Field.Set>
  <Field.Group>
    <Field.Field orientation="responsive">
      <NumSlider
        label="X-Ray Wavelength (Å)"
        bind:value={probe.wavelength}
        min={WAVELENGTH_MIN}
        max={WAVELENGTH_MAX}
        step="0.01"
      />
    </Field.Field>
    <Field.Field orientation="responsive">
      <NumSlider
        label="X-Ray Energy (keV)"
        bind:value={
          () => +wavelengthToKev(probe.wavelength).toFixed(4), setEnergyKev
        }
        min={wavelengthToKev(WAVELENGTH_MAX)}
        max={wavelengthToKev(WAVELENGTH_MIN)}
        step="0.001"
        logarithmic
      />
    </Field.Field>
  </Field.Group>
</Field.Set>
