<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Download from '@lucide/svelte/icons/download';
  import { type DataSeries, type RefLine } from 'matterviz';

  import { Button } from '$shadcn/ui/button';
  import { Checkbox } from '$shadcn/ui/checkbox/index.js';
  import * as DropdownMenu from '$shadcn/ui/dropdown-menu';
  import { Label } from '$shadcn/ui/label';

  const {
    qValues,
    deltaSi,
    deltaSSoluteScaled,
    deltaSSolvent,
    deltaSSolventPerMolecule,
    detectorQRange,
  } = $props();

  let clipToDetector = $state(false);
  let wrapper: HTMLDivElement | undefined = $state();

  const SERIES_COLUMNS = [
    { key: 'deltaS_total', label: 'ΔS (Total)', values: () => deltaSi },
    {
      key: 'deltaS_solute_scaled',
      label: 'ΔS Solute (α·ΔS)',
      values: () => deltaSSoluteScaled,
    },
    {
      key: 'deltaS_solvent',
      label: 'ΔS Solvent (normalized)',
      values: () => deltaSSolvent,
    },
    {
      key: 'deltaS_solvent_per_molecule',
      label: 'ΔS Solvent (per molecule)',
      values: () => deltaSSolventPerMolecule,
    },
  ] as const;

  function getSvgElement(): SVGElement | null {
    const svg = wrapper?.querySelector('svg');
    if (!svg) console.warn('DSSPlot: could not find SVG element to export');
    return svg ?? null;
  }

  async function exportPng() {
    const svg = getSvgElement();
    if (!svg) return;
    const { export_svg_as_png } = await import('matterviz/io');
    export_svg_as_png(svg, 'dss-plot.png');
  }

  async function exportSvg() {
    const svg = getSvgElement();
    if (!svg) return;
    const { export_svg_as_svg } = await import('matterviz/io');
    export_svg_as_svg(svg, 'dss-plot.svg');
  }

  async function exportCsv() {
    const { download } = await import('matterviz/io');
    const header = ['q', ...SERIES_COLUMNS.map((col) => col.label)];
    const rows = qValues.map((q: number, idx: number) => [
      q,
      ...SERIES_COLUMNS.map((col) => col.values()?.[idx] ?? ''),
    ]);
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
    download(csv, 'dss-plot-data.csv', 'text/csv;charset=utf-8');
  }

  async function exportJson() {
    const { download } = await import('matterviz/io');
    const data = {
      q: qValues,
      series: Object.fromEntries(
        SERIES_COLUMNS.map((col) => [col.key, col.values() ?? []]),
      ),
    };
    download(
      JSON.stringify(data, null, 2),
      'dss-plot-data.json',
      'application/json;charset=utf-8',
    );
  }

  const refLines = $derived.by(() => {
    if (!detectorQRange) return [];
    return [
      {
        type: 'vertical',
        x: detectorQRange[0],
        style: { color: `var(--primary)`, width: 1.5, dash: `4 2` },
        annotation: { text: `q min`, position: `start`, side: `below` },
      },
      {
        type: 'vertical',
        x: detectorQRange[1],
        style: { color: `var(--primary)`, width: 1.5, dash: `4 2` },
        annotation: { text: `q max`, position: `start`, side: `below` },
      },
    ];
  }) as RefLine[];

  const series = $derived.by(() => {
    const q = qValues;

    return [
      {
        x: q,
        y: deltaSi ?? [],
        label: 'ΔS (Total)',
        markers: 'line',
        line_style: { stroke: `var(--data-total)` },
      },
      {
        x: q,
        y: deltaSSoluteScaled ?? [],
        label: 'ΔS Solute (α·ΔS)',
        markers: 'line',
        line_style: { stroke: `var(--data-solute)` },
      },
      {
        x: q,
        y: deltaSSolvent ?? [],
        label: 'ΔS Solvent (normalized)',
        markers: 'line',
        line_style: { stroke: `var(--data-solvent)` },
      },
      {
        x: q,
        y: deltaSSolventPerMolecule ?? [],
        label: 'ΔS Solvent (per molecule)',
        markers: 'line',
        line_style: { stroke: `var(--data-permol)` },
      },
    ];
  }) as DataSeries[];

  const xRange: [number | null, number | null] = $derived.by(() => {
    if (!clipToDetector) return [0, qValues[qValues.length - 1]];

    return [
      detectorQRange ? detectorQRange[0] * 0.9 : null,
      detectorQRange ? detectorQRange[1] * 1.1 : null,
    ];
  });
</script>

<div class="flex flex-col gap-3">
  {#await import('matterviz/plot') then { ScatterPlot }}
    <ScatterPlot
      {series}
      ref_lines={refLines}
      x_axis={{ label: 'q (Å⁻¹)', range: xRange }}
      y_axis={{ label: 'ΔS (a.u.)' }}
      style="height: 320px; --scatter-grid-stroke: var(--plot-grid); --plot-zero-line-color: var(--plot-zero-line); --text-color: var(--muted-foreground); --plot-legend-item-color: var(--muted-foreground); font-family: var(--font-mono);"
      legend={{ layout: 'horizontal' }}
      bind:wrapper
    />
  {/await}

  <div class="flex items-center justify-between gap-3">
    <div class="flex items-center gap-3">
      <Checkbox bind:checked={clipToDetector} />
      <Label>Clip to Detector Q Range</Label>
    </div>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button variant="outline" size="sm" class="bg-transparent" {...props}>
            <Download class="mr-2 size-4" />
            Export
            <ChevronDown class="ml-2 size-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-40">
        <DropdownMenu.Label>Image</DropdownMenu.Label>
        <DropdownMenu.Item onclick={exportPng}>PNG</DropdownMenu.Item>
        <DropdownMenu.Item onclick={exportSvg}>SVG</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Label>Data</DropdownMenu.Label>
        <DropdownMenu.Item onclick={exportCsv}>CSV</DropdownMenu.Item>
        <DropdownMenu.Item onclick={exportJson}>JSON</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <p class="text-xs text-muted-foreground">
    Drag to zoom &middot; Shift+drag to pan &middot; Double-click to reset
  </p>
</div>
