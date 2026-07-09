<script lang="ts">
  interface Props {
    sample: {
      moleculeName: string | undefined | null;
      groundName: string | undefined | null;
      excitedName: string | undefined | null;
      solventName: string | undefined | null;
      concentrationSoluteMolar: number | undefined | null;
    };
  }

  let { sample }: Props = $props();

  // A true "recomputing…" signal requires wiring the dashboard's fetch
  // resources (see scattering-fetcher.svelte.ts) through the shared
  // simulation state — out of scope for the app shell. Until then this
  // reflects whether the sample is fully configured.
  const setupComplete = $derived(
    !!sample.groundName && !!sample.excitedName && !!sample.solventName,
  );
  const simStateText = $derived(
    setupComplete ? 'simulation up to date' : 'setup incomplete',
  );
</script>

<footer
  class="flex h-[34px] shrink-0 items-center gap-4 bg-chrome px-[18px] font-mono text-[11px]"
>
  <span>
    <span class="text-status-label">MOL</span>
    <span class="text-status-value">{sample.moleculeName ?? '—'}</span>
  </span>
  <span>
    <span class="text-status-label">GND</span>
    <span class="text-status-gnd">{sample.groundName ?? '—'}</span>
  </span>
  <span>
    <span class="text-status-label">EXC</span>
    <span class="text-status-exc">{sample.excitedName ?? '—'}</span>
  </span>
  <span>
    <span class="text-status-label">SOLVENT</span>
    <span class="text-status-value">{sample.solventName ?? '—'}</span>
  </span>
  <span>
    <span class="text-status-label">c</span>
    <span class="text-status-value"
      >{sample.concentrationSoluteMolar ?? '—'} mol/L</span
    >
  </span>

  <span class="ml-auto flex items-center gap-2">
    <span
      class="flex size-4 items-center justify-center rounded-full bg-[rgba(47,163,122,.16)]"
    >
      <span class="size-1.5 rounded-full bg-status-ok-dot"></span>
    </span>
    <span class="text-status-value">{simStateText}</span>
  </span>
</footer>
