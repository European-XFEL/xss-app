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

<!--
  relative + h-full override the shadcn primitive's default `fixed` positioning
  on the sidebar-container element (see src/lib/shadcn/components/ui/sidebar/sidebar.svelte).
  This app renders the "sidebar" variant flush in normal document flow between
  the command bar and status bar rather than pinned to the viewport; upstream
  shadcn-svelte now applies `fixed` to every variant, so this override must be
  re-verified after any `shadcn-svelte add sidebar --overwrite`.
-->
<Sidebar.Root
  bind:ref
  {collapsible}
  {...restProps}
  variant="sidebar"
  class="relative h-full border-line px-[9px] py-[12px]"
  style="--sidebar: transparent"
>
  <Sidebar.Content class="gap-0">
    <SidebarContent />
  </Sidebar.Content>

  <SidebarFooter />

  <Sidebar.Rail />
</Sidebar.Root>
