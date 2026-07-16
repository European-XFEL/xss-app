<script module lang="ts">
  import type { Molecules } from '../types';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import * as Tooltip from '$shadcn/ui/tooltip/index.js';

  import MoleculeTableCard from './MoleculeTableCard.svelte';

  // Covers: a molecule with multiple states (ground + excited files), a long
  // description that wraps, a single-file molecule, and a read-only entry.
  const molecules: Molecules = [
    {
      id: 'water-ground',
      filename: 'water_ground.xyz',
      sha: 'aaaa1111',
      moleculeName: 'Water',
      description:
        'Ground-state geometry, optimized at the B3LYP/6-31G* level.',
      state: 0,
      reference: 'https://doi.org/10.1000/water-ground',
      atomCount: 3,
      readOnly: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: undefined,
    },
    {
      id: 'water-excited',
      filename: 'water_excited.xyz',
      sha: 'aaaa2222',
      moleculeName: 'Water',
      description: 'First excited-state geometry from TD-DFT.',
      state: 1,
      reference: null,
      atomCount: 3,
      readOnly: false,
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-03'),
    },
    {
      id: 'long-description',
      filename: 'complex_ligand.xyz',
      sha: 'bbbb3333',
      moleculeName: 'Iron Complex Ligand',
      description:
        'A large octahedral iron(II) coordination complex with bipyridine ligands, used as a benchmark structure for testing how the table wraps long free-text descriptions across multiple lines without disrupting row alignment or the sibling columns.',
      state: 0,
      reference: null,
      atomCount: 87,
      readOnly: false,
      createdAt: new Date('2026-02-10'),
      updatedAt: undefined,
    },
    {
      id: 'single-file',
      filename: 'benzene.xyz',
      sha: 'cccc4444',
      moleculeName: 'Benzene',
      description: 'Single-file reference molecule with no excited-state pair.',
      state: 0,
      reference: 'https://doi.org/10.1000/benzene',
      atomCount: 12,
      readOnly: false,
      createdAt: new Date('2026-01-15'),
      updatedAt: undefined,
    },
    {
      id: 'read-only',
      filename: 'seed_reference.xyz',
      sha: 'dddd5555',
      moleculeName: 'Seed Reference',
      description: 'Bundled seed data; not editable from the UI.',
      state: 0,
      reference: null,
      atomCount: 5,
      readOnly: true,
      createdAt: new Date('2025-12-01'),
      updatedAt: undefined,
    },
  ];

  const { Story } = defineMeta({
    title: 'molecule/MoleculeTableCard',
    component: MoleculeTableCard,
    parameters: {
      // MoleculeTable reads page.data.capabilities.upload directly.
      sveltekit_experimental: {
        state: {
          page: {
            data: { capabilities: { upload: { available: true } } },
          },
        },
      },
    },
    args: {
      molecules,
      ground: molecules[0],
      excited: molecules[1],
      onToggleGround: () => {},
      onToggleExcited: () => {},
      onSelectGroup: () => {},
    },
  });
</script>

<!-- The table's tooltip cells need the Tooltip.Provider context that the
     app's root layout normally supplies (via Sidebar.Provider). -->
{#snippet template(args: Parameters<typeof MoleculeTableCard>[1])}
  <Tooltip.Provider delayDuration={0}>
    <MoleculeTableCard {...args} />
  </Tooltip.Provider>
{/snippet}

<Story name="Default" {template} />

<Story name="Loading" args={{ loading: true }} {template} />

<Story name="No Selection" args={{ ground: null, excited: null }} {template} />

<Story
  name="Empty"
  args={{ molecules: [], ground: null, excited: null }}
  {template}
/>
