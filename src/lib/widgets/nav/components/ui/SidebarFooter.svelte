<script lang="ts">
  import * as Sidebar from '$shadcn/ui/sidebar/index.js';

  import { BugsFeatures, FeedbackButton } from '$lib/widgets/feedback';
</script>

<Sidebar.Footer class="gap-[3px] p-0 pt-1.5">
  <Sidebar.Menu class="gap-[3px]">
    <FeedbackButton />
    <BugsFeatures />
  </Sidebar.Menu>
</Sidebar.Footer>
