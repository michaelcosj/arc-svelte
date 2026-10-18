<script lang="ts">
	import { onDestroy } from 'svelte';
	import { DropdownMenu as Primitive } from 'bits-ui';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { easeInOut, motionTokens as m, springCurve } from '#lib/motion';
	import TriggerLabel from './TriggerLabel.svelte';
	import type { DropdownMenuProps } from './types';
	import './dropdown-menu.css';

	let { label, items, icon }: DropdownMenuProps = $props();

	// Radix labels the menu by its trigger; Bits UI doesn't, so wire it up here.
	const uid = $props.id();
	const triggerId = `arc-dropdown-menu-${uid}`;

	type Target = { top: number; height: number; danger: boolean; glide: boolean };

	/** `motion`'s ease for a transition that only sets a duration. */
	const reduced = $derived(prefersReducedMotion.current);

	// One highlight glides between items for the pointer and jumps instantly for the keyboard.
	let highlight = $state<Target | null>(null);
	// Like `initial={false}`: no transform or height until the first item is highlighted.
	let placed = $state(false);
	const box = new Tween({ y: 0, height: 0 });
	const alpha = new Tween(0);
	let pointer = false;
	let clearTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => clearTimeout(clearTimer));

	function show(next: Target | null, instant = false) {
		highlight = next;
		const fade = { duration: instant || reduced ? 0 : 80, easing: easeInOut };
		if (!next) {
			// motion returns the dropped y and height to their base values at once (transition
			// `{ duration: 0 }`), so the cleared highlight collapses while its opacity fades.
			placed = false;
			void alpha.set(0, fade);
			return;
		}
		placed = true;
		// Ends where motion stops the spring for this distance (restDelta), not at the curve's tail.
		const distance = Math.round(Math.abs(next.top - box.current.y));
		void box.set(
			{ y: next.top, height: next.height },
			next.glide && !reduced && distance ? springCurve(m.specs.snappy, distance) : { duration: 0 }
		);
		void alpha.set(1, fade);
	}

	// Bits UI focuses the highlighted item (pointer or keyboard) and the content when the pointer leaves an item.
	function onfocusin(event: FocusEvent) {
		const item =
			event.target instanceof HTMLElement
				? event.target.closest<HTMLElement>('[role="menuitem"]')
				: null;
		clearTimeout(clearTimer);
		if (!item) {
			// A short grace period keeps the highlight gliding across separators and item gaps.
			clearTimer = setTimeout(() => show(null), pointer ? 70 : 0);
			return;
		}
		show({
			top: item.offsetTop,
			height: item.offsetHeight,
			danger: item.dataset.tone === 'danger',
			glide: pointer && highlight !== null
		});
	}

	function onOpenChange(open: boolean) {
		if (!open) return;
		clearTimeout(clearTimer);
		// The content mounts afresh, so the highlight starts hidden instead of fading out.
		show(null, true);
	}
</script>

<Primitive.Root {onOpenChange}>
	<Primitive.Trigger id={triggerId} class="arc-dropdown-menu__trigger" type="button">
		{#if icon}
			<span class="arc-dropdown-menu__trigger-icon" aria-hidden="true">{@render icon()}</span>
		{/if}
		<TriggerLabel text={label} />
		<ChevronDown
			class="arc-dropdown-menu__chevron"
			size={15}
			strokeWidth={1.8}
			aria-hidden="true"
		/>
	</Primitive.Trigger>
	<Primitive.Portal>
		<Primitive.Content
			class="arc-dropdown-menu__menu"
			aria-labelledby={triggerId}
			sideOffset={6}
			align="end"
			collisionPadding={12}
			loop
			{onfocusin}
			onpointermovecapture={() => (pointer = true)}
			onkeydowncapture={() => (pointer = false)}
		>
			<span
				class="arc-dropdown-menu__highlight"
				data-tone={highlight?.danger ? 'danger' : undefined}
				aria-hidden="true"
				style:transform={placed ? `translateY(${box.current.y}px)` : undefined}
				style:height={placed ? `${box.current.height}px` : undefined}
				style:opacity={alpha.current}
			></span>
			{#each items as item, index (item.label)}
				{#if item.separatorBefore}
					<Primitive.Separator class="arc-dropdown-menu__separator" aria-orientation="horizontal" />
				{/if}
				<Primitive.Item
					class={['arc-dropdown-menu__item', item.destructive && 'arc-dropdown-menu--destructive']}
					data-tone={item.destructive ? 'danger' : undefined}
					style="--i: {index}"
					disabled={item.disabled}
					onSelect={() => item.onSelect?.()}
				>
					{#if item.icon}
						<span class="arc-dropdown-menu__icon" aria-hidden="true">{@render item.icon()}</span>
					{/if}
					{item.label}
				</Primitive.Item>
			{/each}
		</Primitive.Content>
	</Primitive.Portal>
</Primitive.Root>
