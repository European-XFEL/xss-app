<script lang="ts">
  import type { CartesianPoint } from '../../types';

  import * as Field from '$shadcn/ui/field/index.js';
  import { Input } from '$shadcn/ui/input/index.js';

  import { NumSlider } from '$lib/shared/ui';

  type Props = {
    distance: number;
    beamCenter: CartesianPoint;
  };

  let { distance = $bindable(), beamCenter = $bindable() }: Props = $props();
</script>

<Field.Set>
  <Field.Field>
    <Field.Label>Detector</Field.Label>
    <p class="text-sm font-medium">LPD</p>
  </Field.Field>

  <Field.Field>
    <NumSlider
      label="Sample Detector Distance(mm)"
      bind:value={distance}
      min="100"
      max="500"
    />
  </Field.Field>

  <Field.Group class="flex flex-wrap">
    <Field.Field>
      <Field.Label>Beam Center (px)</Field.Label>
      <div class="grid grid-cols-2 gap-4">
        <Input type="number" bind:value={beamCenter.x} />
        <Input type="number" bind:value={beamCenter.y} />
      </div>
    </Field.Field>
  </Field.Group>
</Field.Set>
