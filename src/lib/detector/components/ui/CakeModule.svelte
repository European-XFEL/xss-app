<script lang="ts">
  import type { CartesianPoint, DetectorModule } from '../../types';

  import { fade } from 'svelte/transition';

  import { useDrag } from './useDrag.svelte';

  interface Props {
    module: DetectorModule;
    onDrag: (id: string, newPos: CartesianPoint) => void;
    svgElement: SVGSVGElement | null;
  }

  let { module, onDrag, svgElement }: Props = $props();

  const moduleLabel = $derived(module.id.replace('module-', 'Module '));
  const moduleColor = $derived(module.color ?? 'var(--color-muted-foreground)');
  const moduleLabelColor = $derived(
    `color-mix(in oklab, ${moduleColor}, black 25%)`,
  );

  const drag = useDrag({
    getSvgElement: () => svgElement,
    onDrag: (pos) => onDrag(module.id, pos),
    getOffset: () => module.position,
  });
</script>

<g
  role="button"
  tabindex="0"
  aria-label={`${moduleLabel} detector module`}
  class="cursor-grab transition-[transform] outline-none active:cursor-grabbing"
  style="touch-action: none"
  data-module-id={module.id}
  onmousedown={drag.handleMouseDown}
>
  <rect
    in:fade|global={{ duration: 800 }}
    x={module.position.x}
    y={module.position.y}
    width={module.shape.width}
    height={module.shape.height}
    fill={moduleColor}
    fill-opacity="0.3"
    stroke={moduleColor}
    stroke-width="1.5"
    class="hover:fill-opacity-45 pointer-events-auto transition-[fill-opacity]"
  />
  <text
    x={module.position.x + module.shape.width / 2}
    y={module.position.y + module.shape.height / 2}
    text-anchor="middle"
    dominant-baseline="middle"
    fill={moduleLabelColor}
    font-size="11"
    font-weight="600"
    class="pointer-events-none tracking-tight select-none"
  >
    {moduleLabel.replace('Module ', 'M')}
  </text>
</g>
