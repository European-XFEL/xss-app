<script lang="ts">
  import ExternalLink from '@lucide/svelte/icons/external-link';

  type Props = {
    value: string | null;
  };

  let { value }: Props = $props();

  function isValidUrl(str: string | null): boolean {
    if (!str) return false;
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }
</script>

{#if isValidUrl(value)}
  <!-- eslint-disable svelte/no-navigation-without-resolve -->
  <a
    href={value}
    target="_blank"
    rel="noopener noreferrer"
    class="flex max-w-50 items-center gap-1 truncate text-primary hover:underline"
  >
    <span class="truncate">{value}</span>
    <ExternalLink class="size-3 shrink-0" />
  </a>
  <!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
  <span class="text-muted-foreground">{value ?? '-'}</span>
{/if}
