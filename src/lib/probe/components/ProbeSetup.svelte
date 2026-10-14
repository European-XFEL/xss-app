<script lang="ts">
  import { kevToWavelength, wavelengthToKev } from '../energy';

  import * as Field from '$shadcn/ui/field';

  import { NumSlider } from '$lib/shared/ui';

  type Props = {
    probe: { wavelength: number };
  };

  let { probe = $bindable() }: Props = $props();

  // keV is a view of the stored wavelength (Å), which is what the URL carries.
  // Display is rounded; empty/invalid input leaves the wavelength untouched.
  function setEnergyKev(next: number | string | null) {
    const kev = Number(next);
    if (next !== '' && next != null && kev > 0) {
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
        min="0.1"
        max="2.0"
        step="0.01"
      />
    </Field.Field>
    <Field.Field orientation="responsive">
      <NumSlider
        label="X-Ray Energy (keV)"
        bind:value={
          () => +wavelengthToKev(probe.wavelength).toFixed(4), setEnergyKev
        }
        min={wavelengthToKev(2.0)}
        max={wavelengthToKev(0.1)}
        step="0.001"
        logarithmic
      />
    </Field.Field>
  </Field.Group>
</Field.Set>
