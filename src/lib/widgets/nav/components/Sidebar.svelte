<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import * as Sidebar from '$shadcn/ui/sidebar/index.js';

  import SidebarContent from './ui/SidebarContent.svelte';
  import SidebarFooter from './ui/SidebarFooter.svelte';

  let {
    ref = $bindable(null),
    collapsible = 'icon',
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root
  bind:ref
  {collapsible}
  {...restProps}
  variant="sidebar"
  class="border-line px-[9px] py-[12px]"
  style="--sidebar: transparent"
>
  <Sidebar.Content class="gap-0">
    <SidebarContent />
  </Sidebar.Content>

  <SidebarFooter />

  <Sidebar.Rail />
</Sidebar.Root>
