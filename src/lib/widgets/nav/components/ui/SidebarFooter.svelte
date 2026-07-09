<script lang="ts">
  import * as Sidebar from '$shadcn/ui/sidebar/index.js';

  import { BugsFeatures, FeedbackDialog } from '$lib/widgets/feedback';
</script>

<Sidebar.Footer class="gap-[3px] p-0 pt-1.5">
  <Sidebar.Menu class="gap-[3px]">
    <FeedbackDialog />
    <BugsFeatures />
  </Sidebar.Menu>
</Sidebar.Footer>
