<script lang="ts" module>
  import {
    Beaker,
    BookOpen,
    Fullscreen,
    GitCompare,
    History,
    LayoutDashboard,
    Microscope,
    Projector,
    TestTube,
    Upload,
  } from '@lucide/svelte';

  import type { Pathname } from '$app/types';

  interface NavItem {
    title: string;
    url?: Pathname;
    icon: typeof LayoutDashboard;
    disabled?: boolean;
  }

  interface NavSection {
    title: string;
    url?: Pathname;
    items: NavItem[];
  }

  let data: NavSection[] = [
    {
      title: '',
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: 'Docs',
          url: '/docs',
          icon: BookOpen,
        },
      ],
    },
    {
      title: 'Experiment',
      items: [
        {
          title: 'Sample',
          url: '/experiment/samples',
          icon: TestTube,
        },
        {
          title: 'Pump/Probe',
          url: '/experiment/pump-probe',
          icon: Projector,
        },
        {
          title: 'X-Ray Detector',
          url: '/experiment/detector',
          icon: Fullscreen,
        },
      ],
    },
    {
      title: 'Results',
      items: [
        {
          title: 'Compare',
          // url: '/results/compare',
          icon: GitCompare,
          disabled: true,
        },
        {
          title: 'History',
          // url: '/results/history',
          icon: History,
          disabled: true,
        },
      ],
    },
    {
      title: 'Define',
      items: [
        {
          title: 'Molecular Files',
          // url: '/define/upload',
          icon: Upload,
          disabled: true,
        },
        {
          title: 'Solvents',
          // url: '/define/solvent',
          icon: Beaker,
          disabled: true,
        },
        {
          title: 'Detectors',
          // url: '/define/detectors',
          icon: Microscope,
          disabled: true,
        },
      ],
    },
  ];
</script>

<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import * as Sidebar from '$shadcn/ui/sidebar/index.js';

  import { cn } from '$lib/shadcn/utils';
</script>

{#each data as group (group.title)}
  <Sidebar.Group class="px-0 py-1.5">
    {#if group.title}
      <Sidebar.GroupLabel class="h-auto px-0 pt-3 pb-1.5 eyebrow"
        >{group.title}</Sidebar.GroupLabel
      >
    {/if}
    <Sidebar.GroupContent>
      <Sidebar.Menu class="gap-[3px]">
        {#each group.items as item (item.title)}
          {@const isActive =
            item?.url && page.url.pathname === resolve(item.url)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              isActive={!!isActive}
              class={cn(
                'gap-[9px] rounded-[6px] border-l-2 border-transparent px-[9px] py-[6px] text-[12.5px]',
                '[&_svg]:size-[14px] [&_svg]:text-muted-foreground',
                isActive &&
                  'border-l-primary bg-accent-tint font-semibold text-foreground [&_svg]:text-primary',
              )}
              {...item?.disabled
                ? { 'aria-disabled': 'true', tabindex: -1 }
                : {}}
            >
              {#snippet tooltipContent()}
                {item.title}
              {/snippet}
              {#snippet child({ props })}
                {#if item?.url}
                  <a href={resolve(item.url)} {...props}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                {:else}
                  <div {...props}>
                    <item.icon />
                    <span>{item.title}</span>
                  </div>
                {/if}
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu>
    </Sidebar.GroupContent>
  </Sidebar.Group>
{/each}
