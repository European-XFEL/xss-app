<script lang="ts">
  import type { DetectorModule } from '../../types';

  interface Props {
    modules: DetectorModule[];
  }

  let { modules }: Props = $props();
</script>

<div class="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
  {#each modules as module (module.id)}
    <div
      class="flex items-center gap-2 rounded-full border border-line bg-background/70 px-3 py-1"
    >
      <span
        class="size-3 rounded-full"
        style={`background-color: ${module.color};`}
        aria-hidden="true"
      ></span>
      <span class="font-medium">{module.id.replace('module-', 'Module ')}</span>
    </div>
  {/each}
</div>
