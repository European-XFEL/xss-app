<script lang="ts">
  import FlaskRoundIcon from '@lucide/svelte/icons/flask-round';

  // Minimal placeholder for the instrument console's command bar: brand only
  // for now. A later task adds the run context (title, meta, status pill)
  // and the right-side actions (Save run / Export / Add to compare) — the
  // divider and the two flex regions below are left in place as anchors for
  // that work.
</script>

<header
  class="flex h-[52px] shrink-0 items-center justify-between bg-chrome px-[18px]"
>
  <div class="flex items-center gap-2.5">
    <div
      class="flex size-[25px] shrink-0 items-center justify-center rounded-[6px] bg-primary text-primary-foreground"
    >
      <FlaskRoundIcon class="size-3.5" />
    </div>
    <span class="text-[12.5px] font-semibold text-chrome-fg">
      Scattering Simulator
    </span>

    <!-- Run context (title / meta / status pill) lands here. -->
  </div>

  <div class="flex items-center gap-2">
    <!-- Save run / Export / Add to compare actions land here. -->
  </div>
</header>
