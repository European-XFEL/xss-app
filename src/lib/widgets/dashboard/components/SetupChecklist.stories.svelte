<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import SetupChecklist from './SetupChecklist.svelte';

  const { Story } = defineMeta({
    title: 'widgets/dashboard/SetupChecklist',
    component: SetupChecklist,
    args: {
      hasGroundMolecule: false,
      hasExcitedMolecule: false,
      hasSolvent: false,
    },
  });
</script>

<Story name="None Complete" />

<Story name="Partially Complete" args={{ hasSolvent: true }} />

<Story
  name="All Complete"
  args={{ hasGroundMolecule: true, hasExcitedMolecule: true, hasSolvent: true }}
/>
