<script lang="ts">
  import { Info } from '@lucide/svelte';

  import { resolve } from '$app/paths';

  import * as Sidebar from '$shadcn/ui/sidebar/index.js';

  import { FeedbackButton } from '$lib/widgets/feedback';
</script>

<Sidebar.Footer class="gap-[3px] p-0 pt-1.5">
  <Sidebar.Menu class="gap-[3px]">
    <FeedbackButton />
    <Sidebar.MenuItem>
      <Sidebar.MenuButton tooltipContent="About & Credits">
        {#snippet child({ props })}
          <a href={resolve('/about')} {...props}>
            <Info />
            <span>About &amp; Credits</span>
          </a>
        {/snippet}
      </Sidebar.MenuButton>
    </Sidebar.MenuItem>
  </Sidebar.Menu>
</Sidebar.Footer>
