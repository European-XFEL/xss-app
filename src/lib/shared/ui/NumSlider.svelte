<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  import { Input } from '$shadcn/ui/input/index.js';
  import { Label } from '$shadcn/ui/label/index.js';
  import { Slider } from '$shadcn/ui/slider/index.js';

  type Props = {
    value: number | string | null;
    label: string;
    classNum?: string;
    classRange?: string;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    'aria-invalid'?: HTMLInputAttributes['aria-invalid'];
  };

  let {
    value = $bindable(),
    classNum = 'nodrag h-7 w-14 shrink-0 rounded-[7px] border-line px-1.5 text-center font-mono text-[11.5px] font-semibold',
    classRange,
    label,
    min,
    max,
    step,
    ...rest
  }: Props = $props();

  const numMin = $derived(min === undefined ? undefined : Number(min));
  const numMax = $derived(max === undefined ? undefined : Number(max));
  const numStep = $derived(step === undefined ? undefined : Number(step));

  let sliderValue = $derived(
    typeof value === 'number' ? value : Number(value ?? numMin ?? 0),
  );
</script>

<div class="grid grow gap-2 @sm:min-w-40">
  <div class="flex items-center justify-between gap-4">
    <Label class="text-foreground">{label}</Label>
    <Input
      bind:value
      type="number"
      class={classNum}
      {min}
      {max}
      {step}
      {...rest}
    />
  </div>
  <Slider
    type="single"
    value={sliderValue}
    onValueChange={(next) => (value = next)}
    min={numMin}
    max={numMax}
    step={numStep}
    aria-invalid={rest['aria-invalid']}
    class={classRange}
  />
</div>
