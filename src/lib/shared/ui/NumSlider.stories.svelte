<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import NumSlider from './NumSlider.svelte';

  const { Story } = defineMeta({
    title: 'shared/ui/NumSlider',
    component: NumSlider,
    args: {
      label: 'Distance',
      value: 50,
      min: 0,
      max: 100,
      step: 1,
    },
  });
</script>

<Story name="Default" />

<Story name="With Decimal Step" args={{ label: 'Wavelength', value: 1.5, min: 0, max: 5, step: 0.1 }} />
