<script lang="ts">
  import * as Field from '$shadcn/ui/field/index.js';
  import * as Select from '$shadcn/ui/select/index.js';

  import type { Sample } from '$lib/sample';
  import type { listMolecules } from '$lib/shared/api/api';

  type Molecules = Awaited<ReturnType<typeof listMolecules>>;

  type Props = {
    molecules: Molecules;
    ground?: Sample['ground'];
    excited?: Sample['excited'];
    loading?: boolean;
  };

  let {
    molecules,
    ground = $bindable(),
    excited = $bindable(),
    loading = false,
  }: Props = $props();

  let moleculesNames = $derived(new Set(molecules?.map((m) => m.moleculeName)));

  let moleculeName = $state<string>();

  let moleculeStates = $derived.by(() => {
    if (!molecules) return [];
    return molecules.filter((m) => m.moleculeName === moleculeName);
  });

  // Local state for select values (IDs)
  let groundId = $state<string>();
  let excitedId = $state<string>();

  // Auto-select ground/excited when molecule changes
  $effect(() => {
    if (!moleculeStates.length) return;
    const g = moleculeStates.find((s) => s.state === 0);
    const e = moleculeStates.find((s) => s.state === 1);
    if (g) {
      groundId = g.id;
    }
    if (e) {
      excitedId = e.id;
    }
  });

  function onMoleculeChange(name: string) {
    moleculeName = name;
    const states = molecules?.filter((m) => m.moleculeName === name) ?? [];
    const g = states.find((s) => s.state === 0);
    const e = states.find((s) => s.state === 1);
    if (g) {
      groundId = g.id;
      ground = g;
    } else {
      groundId = undefined;
      ground = null;
    }
    if (e) {
      excitedId = e.id;
      excited = e;
    } else {
      excitedId = undefined;
      excited = null;
    }
  }

  function onGroundChange(id: string) {
    groundId = id;
    ground = moleculeStates.find((s) => s.id === id) ?? null;
  }

  function onExcitedChange(id: string) {
    excitedId = id;
    excited = moleculeStates.find((s) => s.id === id) ?? null;
  }
</script>

<div class="py-3 first:pt-0 last:pb-0">
  <Field.Set>
    <Field.Group>
      <Field.Field>
        <Field.Label>Molecule</Field.Label>
        <Select.Root
          name="molecule"
          type="single"
          disabled={loading}
          value={moleculeName}
          onValueChange={onMoleculeChange}
        >
          <Select.Trigger class="w-full justify-between">
            {moleculeName || 'Select molecule'}
          </Select.Trigger>
          <Select.Content class="w-(--radix-select-trigger-width)">
            {#each moleculesNames as moleculeName (moleculeName)}
              <Select.Item value={moleculeName} label={moleculeName}>
                {moleculeName}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </Field.Field>
    </Field.Group>
  </Field.Set>
</div>

<div class="py-3 first:pt-0 last:pb-0">
  <Field.Set class="flex flex-row gap-4">
    <Field.Field>
      <Field.Label>Ground State</Field.Label>
      <Select.Root type="single" value={groundId} onValueChange={onGroundChange}>
        <Select.Trigger>
          {ground ? `${ground.filename}` : 'Select ground state'}
        </Select.Trigger>
        <Select.Content>
          {#each moleculeStates as state (state.id)}
            <Select.Item value={state.id} label={`${state.moleculeName}`}>
              {state.filename}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </Field.Field>
    <Field.Field>
      <Field.Label>Excited State</Field.Label>
      <Select.Root type="single" value={excitedId} onValueChange={onExcitedChange}>
        <Select.Trigger>
          {excited ? `${excited.filename}` : 'Select excited state'}
        </Select.Trigger>
        <Select.Content>
          {#each moleculeStates as state (state.id)}
            <Select.Item value={state.id} label={`${state.moleculeName}`}>
              {state.filename}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </Field.Field>
  </Field.Set>
</div>
