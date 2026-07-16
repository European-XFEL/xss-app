<script lang="ts">
  import { Atom, LineChart } from '@lucide/svelte';

  import * as Resizable from '$shadcn/ui/resizable/index.js';
  import { ScrollArea } from '$shadcn/ui/scroll-area/index.js';
  import * as Tabs from '$shadcn/ui/tabs/index.js';

  import { useSimulationState } from '$lib/app/simulation-context.svelte';
  import { listMolecules } from '$lib/molecule/molecule.remote';
  import { listSolvents } from '$lib/sample/solvent.remote';
  import {
    computeDeltaS,
    createScatteringCalculations,
    createScatteringResource,
    fetchDeltaSSolute,
    fetchDeltaSSolvent,
    isValidQRange,
    scaleSoluteByExcitedFraction,
  } from '$lib/simulation';
  import type { VizMode } from '$lib/widgets/dashboard';
  import {
    ConfigPane,
    MoleculePane,
    ResultsPane,
    SetupChecklist,
    VizModeToggle,
  } from '$lib/widgets/dashboard';

  const simulation = useSimulationState();

  // Stable remote-function instances: `.current` starts undefined and
  // updates reactively, including after the upload form's single-flight
  // `listMolecules` refresh (see molecule.remote.ts).
  const moleculesQuery = listMolecules();
  const solventsQuery = listSolvents();

  const solvents = $derived(solventsQuery.current ?? []);
  const molecules = $derived(moleculesQuery.current ?? []);

  let short = $state(true);

  let centerTab = $state<'scattering' | 'molecule'>('scattering');
  let vizMode = $state<VizMode>('trajectory');

  const calculations = createScatteringCalculations(simulation);

  const soluteResource = createScatteringResource(
    () =>
      fetchDeltaSSolute(
        simulation.qRange,
        simulation.sample.ground!.id,
        simulation.sample.excited!.id,
      ),
    () =>
      !!(simulation.sample.ground?.id && simulation.sample.excited?.id) &&
      isValidQRange(simulation.qRange),
  );

  const solventResource = createScatteringResource(
    () =>
      fetchDeltaSSolvent(
        simulation.qRange,
        simulation.sample.solvent!.id,
        calculations.ratioSolventSolute!,
        calculations.deltaT!,
      ),
    () =>
      !!simulation.sample.solvent?.id &&
      calculations.ratioSolventSolute != null &&
      calculations.deltaT != null &&
      isValidQRange(simulation.qRange),
  );

  const deltaS = $derived(
    computeDeltaS(
      soluteResource.value,
      solventResource.value,
      calculations.excitedStateFraction,
    ),
  );

  const deltaSi = $derived(deltaS?.i ?? null);
  const qValues = $derived(
    deltaS?.q ?? solventResource.value?.q ?? soluteResource.value?.q ?? [],
  );

  const deltaSSoluteScaled = $derived(
    scaleSoluteByExcitedFraction(
      soluteResource.value,
      calculations.excitedStateFraction,
    ),
  );

  const deltaSSolvent = $derived(solventResource.value?.i ?? null);
  const deltaSSolventPerMolecule = $derived(
    solventResource.value && calculations.ratioSolventSolute != null
      ? solventResource.value.i.map(
          (value) => value / calculations.ratioSolventSolute!,
        )
      : null,
  );

  const detectorQRange: [number | null, number | null] = $derived.by(() => {
    const qRange = simulation.detector?.qRange;
    return qRange ? [qRange.min, qRange.max] : [null, null];
  });

  const results = $derived({
    qValues,
    deltaSi,
    deltaSSoluteScaled,
    deltaSSolvent,
    deltaSSolventPerMolecule,
    detectorQRange,
    deltaTemperatureK: calculations.deltaT,
    depositedEnergyJoule: calculations.deltaEJ,
  });

  const hasGroundMolecule = $derived(!!simulation.sample.ground?.id);
  const hasExcitedMolecule = $derived(!!simulation.sample.excited?.id);
  const hasSolvent = $derived(!!simulation.sample.solvent?.id);
  const hasAll = $derived(
    hasGroundMolecule && hasExcitedMolecule && hasSolvent,
  );

  // Surface any fetch failure so a backend/DB/parse error is visible rather
  // than silently rendering as an empty chart.
  const fetchError = $derived(
    moleculesQuery.error ??
      solventsQuery.error ??
      soluteResource.error ??
      solventResource.error,
  );
  const isFetching = $derived(
    moleculesQuery.loading ||
      solventsQuery.loading ||
      soluteResource.loading ||
      solventResource.loading,
  );

  $effect(() => {
    simulation.computing = isFetching;
  });

  function retryFetches() {
    // Only query-typed remote functions are refreshable — on the static
    // target the lists are prerendered (served from the build, can't fail),
    // hence the optional call instead of a plain `.refresh()`.
    void (moleculesQuery as { refresh?: () => Promise<void> }).refresh?.();
    void soluteResource.refetch();
    void solventResource.refetch();
  }

  let w: number | null = $state(null);
  let direction: 'horizontal' | 'vertical' = $derived(
    (w ?? 1000) > 900 ? 'horizontal' : 'vertical',
  );
</script>

<div class="flex h-full flex-col" bind:clientWidth={w}>
  <Resizable.PaneGroup
    {direction}
    class="min-h-0 max-w-full flex-1 gap-4 rounded-lg"
  >
    <Resizable.Pane defaultSize={70} class="flex overflow-hidden">
      {#if hasAll}
        <ScrollArea class="w-full flex-1">
          <div class="mr-2">
            {#if fetchError}
              <div
                role="alert"
                class="mb-2 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <span>Failed to compute scattering: {fetchError.message}</span>
                <button
                  class="rounded border border-destructive/40 px-2 py-1 font-medium hover:bg-destructive/20"
                  onclick={retryFetches}
                >
                  Retry
                </button>
              </div>
            {/if}
            <Tabs.Root bind:value={centerTab} class="w-full gap-0">
              <div
                class="mb-4 flex items-center justify-between gap-4 border-b border-line pb-2"
              >
                <Tabs.List variant="line" class="gap-4">
                  <Tabs.Trigger
                    value="scattering"
                    class="gap-1.5 text-sm after:bg-primary data-active:font-semibold"
                  >
                    <LineChart />
                    Difference Scattering ΔS(Q)
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="molecule"
                    class="gap-1.5 text-sm after:bg-primary data-active:font-semibold"
                  >
                    <Atom />
                    Molecule Visualization
                  </Tabs.Trigger>
                </Tabs.List>
                {#if centerTab === 'molecule'}
                  <VizModeToggle bind:value={vizMode} />
                {/if}
              </div>
              <Tabs.Content value="scattering">
                <div class="rounded-lg border border-line p-4">
                  <ResultsPane {...results} />
                </div>
              </Tabs.Content>
              <Tabs.Content value="molecule">
                <div class="rounded-lg border border-line p-4">
                  <MoleculePane sample={simulation.sample} {hasAll} {vizMode} />
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </ScrollArea>
      {:else}
        <div class="flex w-full flex-1 items-center justify-center">
          <SetupChecklist
            {hasGroundMolecule}
            {hasExcitedMolecule}
            {hasSolvent}
          />
        </div>
      {/if}
    </Resizable.Pane>

    <Resizable.Handle />

    <Resizable.Pane defaultSize={20} class="flex max-w-2xl min-w-110">
      <ScrollArea class="flex-1">
        <div class="mr-2">
          <ConfigPane {molecules} {solvents} {short} />
        </div>
      </ScrollArea>
    </Resizable.Pane>
  </Resizable.PaneGroup>
</div>
