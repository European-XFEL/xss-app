<script lang="ts">
  import type { Pump } from '../types';

  import * as Field from '$shadcn/ui/field';
  import * as Tabs from '$shadcn/ui/tabs';

  import { NumSlider } from '$lib/shared/ui';

  type Props = {
    pump: Pump;
  };

  let { pump = $bindable() }: Props = $props();

  const PHOTON_ENERGY_MIN_EV = 1.0;
  const PHOTON_ENERGY_MAX_EV = 5.0;
  const EXCITED_STATE_ENERGY_MIN_EV = 0.1;
  const EXCITED_STATE_ENERGY_MAX_EV = 2;

  // Energy deposited per absorbed photon, clamped at zero (a negative gap is
  // unphysical). Mirrors `computeDeltaEeV` in `$lib/simulation/math`, kept
  // local rather than imported since the pump feature may not depend on the
  // simulation feature (see eslint boundaries/dependencies).
  function computeDeltaEeV(
    photonEnergyEv: number,
    excitedStateEnergyEv: number,
  ) {
    return Math.max(0, photonEnergyEv - excitedStateEnergyEv);
  }

  let inputMode: 'energies' | 'direct' = $state('energies');

  // Only meaningful in 'direct' mode: the fixed knob the user is turning.
  // Re-seeded from the current pump values whenever the mode switches to
  // 'direct' (see `selectMode`), since edits made while in 'energies' mode
  // don't keep this in sync.
  let deltaEeV = $state(
    computeDeltaEeV(pump.photonEnergyEv, pump.excitedStateEnergyEv),
  );

  // Keeps the implied photon energy inside its own valid slider range.
  let deltaEeVMax = $derived(
    Math.max(0, PHOTON_ENERGY_MAX_EV - pump.excitedStateEnergyEv),
  );

  function selectMode(mode: string) {
    if (mode === 'direct') {
      deltaEeV = computeDeltaEeV(
        pump.photonEnergyEv,
        pump.excitedStateEnergyEv,
      );
    }
    inputMode = mode === 'direct' ? 'direct' : 'energies';
  }

  // Writes go straight to `pump.photonEnergyEv` (the same field the
  // 'energies' mode slider binds to), so the throttled consumers in
  // scattering.svelte.ts and the URL sync observe direct-mode edits
  // identically to slider edits. Deliberately event-handler-level writes,
  // not an `$effect`, to avoid a read/write loop on `pump.photonEnergyEv`.
  function setExcitedStateEnergyEv(next: number) {
    pump.excitedStateEnergyEv = next;
    if (inputMode === 'direct') {
      pump.photonEnergyEv = next + deltaEeV;
    }
  }

  function setDeltaEeV(next: number) {
    deltaEeV = next;
    pump.photonEnergyEv = pump.excitedStateEnergyEv + next;
  }

  // In 'direct' mode this is structurally guaranteed (ΔE has a min of 0), so
  // the warning only needs to guard the 'energies' mode's two independent
  // sliders.
  let photonEnergyInvalid = $derived(
    inputMode === 'energies' &&
      pump?.photonEnergyEv < pump?.excitedStateEnergyEv,
  );
</script>

<Field.Set>
  <Field.Field>
    <Field.Label>Pump Energy Input</Field.Label>
    <Tabs.Root value={inputMode} onValueChange={selectMode}>
      <Tabs.List>
        <Tabs.Trigger value="energies">Via energies</Tabs.Trigger>
        <Tabs.Trigger value="direct">Direct ΔE (eV)</Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  </Field.Field>

  <Field.Group>
    <Field.Field orientation="responsive">
      <NumSlider
        label="Excited State Energy (eV)"
        bind:value={
          () => pump.excitedStateEnergyEv,
          (next) => setExcitedStateEnergyEv(Number(next))
        }
        min={EXCITED_STATE_ENERGY_MIN_EV}
        max={EXCITED_STATE_ENERGY_MAX_EV}
        step={0.1}
      />
    </Field.Field>

    {#if inputMode === 'energies'}
      <Field.Field orientation="responsive">
        <NumSlider
          label="Photon Energy (eV)"
          bind:value={pump.photonEnergyEv}
          min={PHOTON_ENERGY_MIN_EV}
          max={PHOTON_ENERGY_MAX_EV}
          step={0.1}
          aria-invalid={photonEnergyInvalid}
        />
      </Field.Field>
    {:else}
      <Field.Field orientation="responsive">
        <NumSlider
          label="ΔE (eV)"
          bind:value={() => deltaEeV, (next) => setDeltaEeV(Number(next))}
          min={0}
          max={deltaEeVMax}
          step={0.1}
        />
        <Field.Description>
          Implied Photon Energy: {pump.photonEnergyEv.toFixed(2)} eV
        </Field.Description>
      </Field.Field>
    {/if}

    <Field.Field orientation="responsive">
      <NumSlider
        label="Excited State Fraction"
        bind:value={pump.excitedStateFraction}
        min={0.0}
        max={1.0}
        step={0.01}
      />
    </Field.Field>
  </Field.Group>

  {#if photonEnergyInvalid}
    <p role="alert" class="text-sm font-medium text-destructive">
      Please make sure the Photon Energy exceeds the Excited State Energy. No
      excited state can form below it, so the excited fraction and ΔT are
      treated as zero.
    </p>
  {/if}
</Field.Set>
