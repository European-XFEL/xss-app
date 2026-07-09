<script lang="ts">
  let { children } = $props();
</script>

<article
  class="mx-auto prose max-w-[820px] px-6 py-10 [&>section+section]:mt-12"
>
  {@render children?.()}
</article>
