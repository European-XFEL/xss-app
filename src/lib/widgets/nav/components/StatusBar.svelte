<script lang="ts">
  import { type NavSample, isSetupComplete } from '../lib/run-context';

  interface Props {
    sample: NavSample;
  }

  let { sample }: Props = $props();

  const simStateText = $derived(
    !isSetupComplete(sample)
      ? 'setup incomplete'
      : sample.computing
        ? 'recomputing…'
        : sample.computeError
          ? 'compute failed'
          : 'simulation up to date',
  );
  const failed = $derived(
    isSetupComplete(sample) && !sample.computing && !!sample.computeError,
  );
</script>

<footer
  class="flex h-[34px] shrink-0 items-center gap-4 bg-chrome px-[18px] font-mono text-xs"
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
      >{sample.concentrationSoluteMmol ?? '—'} mMol/L</span
    >
  </span>

  <span class="ml-auto flex items-center gap-2">
    <span
      class="flex size-4 items-center justify-center rounded-full {failed
        ? 'bg-destructive/15'
        : 'bg-[rgba(47,163,122,.16)]'}"
    >
      <span
        class="size-1.5 rounded-full {failed
          ? 'bg-destructive'
          : 'bg-status-ok-dot'}"
      ></span>
    </span>
    <span class="text-status-value">{simStateText}</span>
  </span>
</footer>
