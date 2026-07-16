<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ChannelPanel from './ChannelPanel.svelte';

  const { Story } = defineMeta({
    title: 'shared/ui/ChannelPanel',
    component: ChannelPanel,
    args: {
      label: 'Beam energy',
      description: 'Configure the incident photon energy for the experiment.',
    },
    argTypes: {
      variant: { control: 'select', options: ['card', 'flat'] },
    },
  });
</script>

<Story name="Card">
  {#snippet template(args)}
    <ChannelPanel
      label={args.label}
      description={args.description}
      variant={args.variant}
    >
      <p class="py-4 text-sm text-muted-foreground">Panel content goes here.</p>
    </ChannelPanel>
  {/snippet}
</Story>

<Story name="Flat" args={{ variant: 'flat' }}>
  {#snippet template(args)}
    <ChannelPanel
      label={args.label}
      description={args.description}
      variant={args.variant}
    >
      <p class="py-4 text-sm text-muted-foreground">Panel content goes here.</p>
    </ChannelPanel>
  {/snippet}
</Story>
