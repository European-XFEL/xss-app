<script lang="ts">
  import { cn } from '$lib/shadcn/utils.js';

  /**
   * Displays a rounded/truncated value inline, but keeps the full-precision
   * value reachable: focusing (click or Tab) pops a selectable overlay with
   * `full` so it can be copied, without changing the trigger's own layout
   * (the overlay is `position: absolute`, so it never reflows sibling
   * elements — important for the dashboard's stat-chip row). Escape (or
   * clicking/tabbing away) hides it again.
   */
  interface Props {
    /** The rounded/formatted text shown at rest. */
    display: string;
    /** The full-precision text revealed on focus. */
    full: string;
    class?: string;
  }

  let { display, full, class: className }: Props = $props();

  let revealed = $state(false);
  let fullEl: HTMLSpanElement | undefined = $state();

  function selectFull() {
    const selection = window.getSelection();
    if (!fullEl || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(fullEl);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function handleFocus() {
    revealed = true;
    // The overlay only exists once `revealed` renders it — select on the
    // next frame so `fullEl` is bound.
    requestAnimationFrame(selectFull);
  }

  function handleBlur() {
    revealed = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      revealed = false;
      (event.currentTarget as HTMLElement).blur();
    }
  }
</script>

<span class={cn('relative inline-block', className)}>
  <span
    tabindex="0"
    role="button"
    aria-label="{display}, click to reveal full precision"
    class="cursor-text rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    title={full}
    onfocus={handleFocus}
    onblur={handleBlur}
    onkeydown={handleKeydown}>{display}</span
  >
  {#if revealed}
    <span
      bind:this={fullEl}
      class="absolute top-full left-0 z-20 mt-1 rounded-md border border-line bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md select-all"
      >{full}</span
    >
  {/if}
</span>
