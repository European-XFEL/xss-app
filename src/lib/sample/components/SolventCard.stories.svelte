<script module lang="ts">
  import type { Solvents } from '../types';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import SolventCard from './SolventCard.svelte';

  const solvents: Solvents = [
    {
      id: 'water',
      name: 'Water',
      rhom: 55.5,
      cpm: 75.3,
      filename: 'water.iq',
      sha: 'deadbeef',
      createdAt: new Date('2026-01-01'),
      updatedAt: undefined,
      qMin: 0,
      qMax: 5,
      qStep: 0.01,
    },
    {
      id: 'ethanol',
      name: 'Ethanol',
      rhom: 17.1,
      cpm: 112.3,
      filename: 'ethanol.iq',
      sha: 'cafebabe',
      createdAt: new Date('2026-01-01'),
      updatedAt: undefined,
      qMin: 0,
      qMax: 5,
      qStep: 0.01,
    },
  ];

  const { Story } = defineMeta({
    title: 'sample/SolventCard',
    component: SolventCard,
    args: {
      solvent: solvents[0],
      concentrationSoluteMolar: 0.5,
      solvents,
    },
  });
</script>

<Story name="Default" />

<Story name="Loading" args={{ loading: true }} />

<Story name="No Solvent Selected" args={{ solvent: null }} />
