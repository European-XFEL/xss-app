<script lang="ts">
	import { Switch as SwitchPrimitive } from "bits-ui";
	import { cn } from "$lib/shadcn/utils.js";

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		class: className,
		...restProps
	}: SwitchPrimitive.RootProps = $props();
</script>

<SwitchPrimitive.Root
	bind:ref
	bind:checked
	data-slot="switch"
	class={cn(
		"peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
		className,
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		<SwitchPrimitive.Thumb
			data-slot="switch-thumb"
			data-state={checked ? "checked" : "unchecked"}
			class={cn(
				"bg-background pointer-events-none block size-4 rounded-full shadow-lg ring-0 transition-transform",
				checked ? "translate-x-4" : "translate-x-0",
			)}
		/>
	{/snippet}
</SwitchPrimitive.Root>
