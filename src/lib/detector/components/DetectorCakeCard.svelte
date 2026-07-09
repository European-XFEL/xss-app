<script lang="ts">
  import type { CartesianPoint, DetectorModule, Shape } from '../types';
  import { BadgeInfo } from '@lucide/svelte';

  import { fade } from 'svelte/transition';

  import { Skeleton } from '$shadcn/ui/skeleton/index.js';
  import * as Tooltip from '$shadcn/ui/tooltip/index.js';

  import { ChannelPanel } from '$lib/shared/ui';

  import CakeModuleLegend from './ui/CakeModuleLegend.svelte';

  interface Props {
    modules: DetectorModule[];
    distance: number;
    beamCenter: CartesianPoint;
    panelShape?: Shape;
    radiusRange: { min: number; max: number };
  }

  let {
    modules = $bindable(),
    distance = $bindable(),
    beamCenter = $bindable(),
    panelShape = { width: 450, height: 600 },
    radiusRange,
  }: Props = $props();
</script>

<!-- TODO: Realistic constraints for module movement -->

<ChannelPanel label="Detector Caking Visualization" class="w-full min-w-fit">
  {#snippet actions()}
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger><BadgeInfo size={16} /></Tooltip.Trigger>
        <Tooltip.Content class="w-fit max-w-xs">
          Drag the <span class="font-medium text-destructive">
            red crosshair</span
          >
          to move the beam center or drag the
          <span class="font-medium text-primary">colored modules</span>
          to reposition them. The caked projection updates in real time.
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  {/snippet}

  <div class="flex min-w-fit flex-col gap-6">
    <div class="flex grow flex-wrap justify-center-safe gap-6">
      <div class="min-w-fit">
        <div class="flow rounded-[12px] bg-canvas p-3 shadow-inner">
          {#await import('./ui/CakeCartesian.svelte')}
            <!-- prettier-ignore -->
            <Skeleton
              class="mx-auto block rounded-lg bg-muted/30"
              style="width: {panelShape.width}px; height: {panelShape.height}px;"
            />
          {:then { default: CakeViewCartesian }}
            <div in:fade>
              <CakeViewCartesian bind:beamCenter bind:modules {panelShape} />
            </div>
          {/await}
        </div>
      </div>
      <div class="min-w-fit">
        <div class="flow rounded-[12px] bg-canvas p-3 shadow-inner">
          {#await import('./ui/CakePolar.svelte')}
            <!-- prettier-ignore -->
            <Skeleton
              class="mx-auto block rounded-lg bg-muted/30"
              style="width: {panelShape.width}px; height: {panelShape.height}px;"
            />
          {:then { default: CakeViewPolar }}
            <div in:fade>
              <CakeViewPolar
                {beamCenter}
                {modules}
                {distance}
                {panelShape}
                {radiusRange}
                tessellationGrid={20}
              />
            </div>
          {/await}
        </div>
      </div>
    </div>
    <CakeModuleLegend {modules} />
  </div>
</ChannelPanel>
