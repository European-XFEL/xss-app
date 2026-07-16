<script lang="ts">
  import { Atom, Beaker, Heart } from '@lucide/svelte';

  import { Badge } from '$shadcn/ui/badge';

  import { ChannelPanel } from '$lib/shared/ui';

  const dataSources = [
    {
      icon: Beaker,
      name: 'Solvent thermal response data',
      provider:
        'Differential scattering (∂S/∂T) curves for the bundled solvents are sourced from the TRWAXS data collection.',
      href: 'https://sites.google.com/site/trwaxs/home/TRWAXS-data',
      linkLabel: 'TRWAXS',
      badge: '8 solvents',
    },
    {
      icon: Atom,
      name: 'Example molecules',
      provider:
        'Ground- and excited-state structures (PtPOP, FeTerpy2, FeBpy3) from published quantum-chemistry calculations; see the DOI reference on each structure in the sample library.',
      badge: '3 molecules',
    },
  ] as const;

  const code = [
    {
      name: 'simex-debye',
      purpose:
        'The simulation backend: Debye-equation scattering, difference signals, and detector image forward-modelling.',
      href: 'https://git.xfel.eu/simulation/simex-debye/',
      linkLabel: 'git.xfel.eu',
      tag: 'Backend',
    },
    {
      name: 'SIMEX / SimEx-Lite',
      purpose:
        'Simulation of experiments at advanced light sources; used for sample data handling (structure parsing) in the backend.',
      href: 'https://github.com/PaNOSC-ViNYL/SimEx-Lite',
      linkLabel: 'GitHub',
      tag: 'Library',
    },
  ] as const;
</script>

<div class="mx-auto flex max-w-[820px] flex-col gap-8 px-6 py-10">
  <section class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">About &amp; Credits</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Data sources, software, and projects that this simulator builds on.
      </p>
    </div>
    <div class="flex flex-col items-end gap-1.5">
      <Badge variant="outline" class="text-muted-foreground">
        simex-debye backend
      </Badge>
      <a
        href="https://git.xfel.eu/simulation/simex-debye/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-primary hover:underline"
      >
        git.xfel.eu/simulation/simex-debye ↗
      </a>
    </div>
  </section>

  <section class="grid items-start gap-6 md:grid-cols-2">
    <ChannelPanel
      label="Data Sources"
      description="Reference data bundled with the app."
    >
      {#each dataSources as entry (entry.name)}
        <div class="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span
            aria-hidden="true"
            class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-tint"
          >
            <entry.icon class="size-3.5 text-primary" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold tracking-tight">{entry.name}</p>
              <Badge variant="outline" class="shrink-0 text-muted-foreground">
                {entry.badge}
              </Badge>
            </div>
            <p class="mt-1 text-sm text-muted-foreground">
              {entry.provider}
              {#if 'href' in entry}
                <!-- eslint-disable svelte/no-navigation-without-resolve -->
                <a
                  href={entry.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >
                  {entry.linkLabel} ↗
                </a>
                <!-- eslint-enable svelte/no-navigation-without-resolve -->
              {/if}
            </p>
          </div>
        </div>
      {/each}
    </ChannelPanel>

    <ChannelPanel
      label="Code &amp; Libraries"
      description="Simulation software this app is built on."
    >
      {#each code as entry (entry.name)}
        <div class="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold tracking-tight">{entry.name}</p>
              <Badge variant="outline" class="shrink-0 text-muted-foreground">
                {entry.tag}
              </Badge>
            </div>
            <p class="mt-1 text-sm text-muted-foreground">
              {entry.purpose}
              <!-- eslint-disable svelte/no-navigation-without-resolve -->
              <a
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline"
              >
                {entry.linkLabel} ↗
              </a>
              <!-- eslint-enable svelte/no-navigation-without-resolve -->
            </p>
          </div>
        </div>
      {/each}
    </ChannelPanel>
  </section>

  <section>
    <div
      class="flex items-center gap-3 rounded-[11px] bg-foreground px-4 py-3 text-background"
    >
      <span
        aria-hidden="true"
        class="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/30"
      >
        <Heart class="size-4 text-background" />
      </span>
      <div>
        <p class="text-sm font-semibold tracking-tight">Acknowledgements</p>
        <p class="text-xs text-background/70">
          Thanks to the TRWAXS collaboration for the published solvent response
          data, and to the SIMEX and PaNOSC-ViNYL projects for the open-source
          simulation tooling this app depends on.
        </p>
      </div>
    </div>
  </section>
</div>
