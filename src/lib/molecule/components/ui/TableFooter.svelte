<script lang="ts">
  type Props = {
    rowCount: number;
    groupCount: number;
  };

  let { rowCount, groupCount }: Props = $props();
</script>

<div class="flex items-center justify-end text-sm text-muted-foreground">
  <div>
    {rowCount} structure files across
    {groupCount} molecules
  </div>
</div>
