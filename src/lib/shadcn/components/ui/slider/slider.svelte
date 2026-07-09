<script lang="ts">
	import { Slider as SliderPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/shadcn/utils.js";

	type Props = WithoutChildrenOrChild<SliderPrimitive.RootProps>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		orientation = "horizontal",
		class: className,
		...restProps
	}: Props = $props();
</script>

<SliderPrimitive.Root
	bind:ref
	bind:value={value as never}
	{orientation}
	class={cn(
		"relative flex touch-none items-center select-none data-disabled:opacity-50 data-horizontal:h-3.5 data-horizontal:w-full data-vertical:h-full data-vertical:min-h-44 data-vertical:w-3.5 data-vertical:flex-col",
		className
	)}
	{...restProps}
>
	{#snippet children({ thumbItems })}
		<span
			data-orientation={orientation}
			class="bg-line relative grow overflow-hidden rounded-full data-horizontal:h-1 data-horizontal:w-full data-vertical:w-1 data-vertical:h-full"
		>
			<SliderPrimitive.Range class="bg-primary absolute data-horizontal:h-full data-vertical:w-full" />
		</span>
		{#each thumbItems as { index } (index)}
			<SliderPrimitive.Thumb
				{index}
				class="border-line bg-background ring-ring/30 block size-3.5 shrink-0 rounded-full border shadow-sm transition-shadow hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
			/>
		{/each}
	{/snippet}
</SliderPrimitive.Root>
