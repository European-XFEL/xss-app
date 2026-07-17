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
    /**
     * Drag the slider track over log10(value) instead of value. For wide
     * ranges (many decades) this keeps the slider's own step count small
     * (bits-ui does O(steps) work per pointermove — see #initial-dev-kfb)
     * and gives even resolution across every decade. The paired number
     * input is unaffected and still edits the raw value at `step`.
     * Requires min > 0.
     *
     * Writes back to `value` on release (bits-ui's onValueCommit) rather
     * than on every drag tick (onValueChange): bits-ui's controlled Slider
     * re-emits onValueChange any time its `value` prop changes for *any*
     * reason, including its own internal step-grid correction — so with a
     * coarse log grid, typing a precise value into the number input would
     * otherwise immediately get snapped and clobbered by that echo.
     * onValueCommit only fires from a genuine drag-release/keyboard nudge,
     * so it can't be triggered by that correction.
     */
    logarithmic?: boolean;
    'aria-invalid'?: HTMLInputAttributes['aria-invalid'];
  };

  let {
    value = $bindable(),
    classNum = 'nodrag h-7 w-16 shrink-0 rounded-[7px] border-line px-1.5 text-center font-mono text-sm font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none',
    classRange,
    label,
    min,
    max,
    step,
    logarithmic = false,
    ...rest
  }: Props = $props();

  const numMin = $derived(min === undefined ? undefined : Number(min));
  const numMax = $derived(max === undefined ? undefined : Number(max));
  const numStep = $derived(step === undefined ? undefined : Number(step));
  // Only valid for min > 0; log-space div by ~100 steps regardless of range.
  const logMode = $derived(logarithmic && !!numMin && numMin > 0);

  let sliderValue = $derived(
    typeof value === 'number' ? value : Number(value ?? numMin ?? 0),
  );

  const logMin = $derived(logMode ? Math.log10(numMin as number) : 0);
  const logMax = $derived(logMode ? Math.log10(numMax as number) : 0);
  const logStep = $derived(logMode ? (logMax - logMin) / 100 : 0);
  const logSliderValue = $derived(
    logMode ? Math.log10(Math.max(sliderValue, numMin as number)) : 0,
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
    value={logMode ? logSliderValue : sliderValue}
    onValueChange={logMode ? undefined : (next) => (value = next)}
    onValueCommit={logMode
      ? (next) => (value = Number((10 ** next).toPrecision(3)))
      : undefined}
    min={logMode ? logMin : numMin}
    max={logMode ? logMax : numMax}
    step={logMode ? logStep : numStep}
    aria-invalid={rest['aria-invalid']}
    class={classRange}
  />
</div>
