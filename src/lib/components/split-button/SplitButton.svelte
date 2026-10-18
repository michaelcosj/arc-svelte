<script lang="ts">
	import { untrack } from 'svelte';
	import { DropdownMenu as Primitive } from 'bits-ui';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { Mounted, motionTokens as m, swap, WidthMorph } from '#lib/motion';
	import SplitGlyphs from './SplitGlyphs.svelte';
	import type { SplitButtonProps } from './types';
	import './split-button.css';
	let { label, actions, onclick, disabled, icon, variant = 'primary' }: SplitButtonProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	// Radix labels the menu by its trigger; Bits UI doesn't, so wire it up here.
	const uid = $props.id();
	const triggerId = `arc-split-button-${uid}`;
	/** Springs the slot to the next label's width; other resizes (a late web font) jump. */
	const width = new WidthMorph(() => ({ reduced, pinned: true, window: 700 }));
	let shown = $state(untrack(() => ({ icon, label })));
	$effect.pre(() => {
		const next = { icon, label };
		untrack(() => {
			if (next.icon === shown.icon && next.label === shown.label) return;
			width.changed();
			shown = next;
		});
	});
</script>

<!-- The main action morphs its icon and label in place while its width follows on a spring; the menu half never scales, so the menu opens from a still anchor. -->
<Primitive.Root>
	<div class={['arc-split-button', variant === 'secondary' && 'arc-split-button--secondary']}>
		<button class="arc-split-button__primary" type="button" {onclick} {disabled}>
			<span class="arc-split-button__primary-slot" aria-hidden="true" {@attach width.body}>
				<span class="arc-split-button__primary-content" {@attach width.content}>
					{#if shown.icon}
						<span class="arc-split-button__main-icon">
							{#key shown.icon}
								<span
									class="arc-split-button__icon-phase"
									in:swap={reduced
										? { duration: m.duration.instant, skip: !mounted.current }
										: {
												scale: 0.6,
												blur: m.blur.subtle,
												...m.spring.snappy,
												fade: { duration: m.duration.fast, easing: m.ease.enter },
												skip: !mounted.current
											}}
									out:swap={reduced
										? { duration: m.duration.instant }
										: {
												scale: 0.6,
												blur: m.blur.subtle,
												duration: m.duration.fast,
												easing: m.ease.standard
											}}>{@render shown.icon()}</span
								>
							{/key}
						</span>
					{/if}
					<SplitGlyphs text={shown.label} {reduced} />
				</span>
			</span>
			<span class="arc-split-button__sr-only" aria-live="polite">{label}</span>
		</button>
		<Primitive.Trigger
			id={triggerId}
			class="arc-split-button__trigger"
			type="button"
			aria-label={`${label} more actions`}
			{disabled}
			><ChevronDown
				class="arc-split-button__chevron"
				size={16}
				strokeWidth={1.75}
				aria-hidden="true"
			/></Primitive.Trigger
		>
	</div>
	<Primitive.Portal>
		<Primitive.Content
			class="arc-split-button__menu"
			aria-labelledby={triggerId}
			sideOffset={4}
			align="end"
			collisionPadding={12}
			loop
		>
			{#each actions as action, index (action.label)}
				<Primitive.Item
					class={['arc-split-button__item', action.destructive && 'arc-split-button--destructive']}
					style="--i: {index}"
					disabled={action.disabled}
					onSelect={() => action.onSelect?.()}
				>
					{#if action.icon}<span class="arc-split-button__icon" aria-hidden="true"
							>{@render action.icon()}</span
						>{/if}{action.label}
				</Primitive.Item>
			{/each}
		</Primitive.Content>
	</Primitive.Portal>
</Primitive.Root>
