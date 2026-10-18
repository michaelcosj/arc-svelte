<script lang="ts">
	import { untrack } from 'svelte';
	import { Mounted, WidthMorph, motionTokens as m, swap } from '#lib/motion';
	import type { ButtonGroupItem } from './types';
	let { item, reduced }: { item: ButtonGroupItem; reduced: boolean } = $props();
	const mounted = new Mounted();
	const width = new WidthMorph(() => ({ reduced, pinned: true, spec: m.specs.morph, window: 700 }));
	let previousIcon: unknown;
	let previousLabel: string | undefined;
	let previousIconKey: string | undefined;
	let phase = $state(0);
	$effect.pre(() => {
		const icon = item.icon,
			iconKey = item.iconKey;
		const label = item.content !== undefined ? '\u0000content' : item.iconOnly ? '' : item.label;
		untrack(() => {
			if (previousIcon === icon && previousIconKey === iconKey && previousLabel === label) return;
			previousIcon = icon;
			previousIconKey = iconKey;
			previousLabel = label;
			width.changed();
			phase += 1;
		});
	});
	const sizers = $derived(
		item.iconOnly || item.content !== undefined
			? []
			: [...new Set([item.label, ...(item.reserve ?? [])])]
	);
</script>

<span class="arc-button-group__slot" aria-hidden="true" {@attach width.body}>
	<span class="arc-button-group__slotContent" {@attach width.content}>
		{#each sizers as text (text)}
			<span class="arc-button-group__phase arc-button-group__sizer">
				{#if item.icon}<span class="arc-button-group__iconBox"></span>{/if}
				<span class="arc-button-group__label" data-collapsible={item.icon ? '' : undefined}
					>{text}</span
				>
			</span>
		{/each}
		{#key phase}
			<span
				class="arc-button-group__phase"
				in:swap={reduced
					? { duration: m.duration.instant, skip: !mounted.current }
					: {
							y: 4,
							blur: m.blur.soft,
							duration: m.duration.standard,
							easing: m.ease.enter,
							skip: !mounted.current
						}}
				out:swap={reduced
					? { duration: m.duration.instant }
					: { y: -3, blur: m.blur.soft, duration: m.duration.fast, easing: m.ease.standard }}
			>
				{#if item.icon}<span class="arc-button-group__icon">{@render item.icon()}</span>{/if}
				{#if item.content !== undefined}<span class="arc-button-group__value"
						>{@render item.content()}</span
					>
				{:else if !item.iconOnly}<span
						class="arc-button-group__label"
						data-collapsible={item.icon ? '' : undefined}>{item.label}</span
					>{/if}
			</span>
		{/key}
	</span>
</span>
