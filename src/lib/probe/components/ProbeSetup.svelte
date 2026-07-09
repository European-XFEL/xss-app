<script lang="ts">
  import type { XRayProbe } from '../types';

  import * as Field from '$shadcn/ui/field';

  import { NumSlider } from '$lib/shared/ui';

  type Props = {
    probe: XRayProbe;
  };

  let { probe = $bindable() }: Props = $props();
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
  </Field.Group>
</Field.Set>
