<script lang="ts" generics="T">
	import { prefersReducedMotion } from 'svelte/motion';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { Mounted, swap, motionTokens as m } from '#lib/motion';
	import type { CardStackProps, CardDecision, CardReturn, CardExit, Point } from './types';
	import StackCard from './StackCard.svelte';
	import './card-stack.css';
	let {
		items,
		getKey,
		getLabel,
		renderCard,
		onDecide,
		onUndo,
		onReset,
		labels = { left: 'Pass', right: 'Keep' },
		outcomes,
		label = 'Cards',
		renderEmpty,
		class: className
	}: CardStackProps<T> = $props();
	const mounted = new Mounted(),
		reduced = $derived(mounted.current && prefersReducedMotion.current),
		hintId = $props.id();
	let position = $state(0),
		history = $state<{ key: string; decision: CardDecision }[]>([]),
		flying = $state<string[]>([]),
		returning = $state<Record<string, CardReturn>>({}),
		message = $state(''),
		lift = $state(0);
	const exits: Record<string, CardExit> = {};
	// Release samples are consumed once, not observed by rendering.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const flings = new Map<string, Point>();
	const top = $derived(items[position]),
		remaining = $derived(Math.max(0, items.length - position));
	function decide(decision: CardDecision) {
		if (!top) return;
		const item = top,
			key = getKey(item);
		lift = 0;
		position++;
		history = [...history, { key, decision }];
		flying = [...flying, key];
		returning = {};
		const left = remaining;
		message = `${getLabel(item)}${outcomes ? ` ${outcomes[decision]}` : `: ${labels[decision]}`}. ${left ? `${left} left.` : 'All cards reviewed.'}`;
		onDecide?.(item, decision);
	}
	function undo() {
		const last = history.at(-1),
			item = last && items.find((entry) => getKey(entry) === last.key);
		if (!last || !item) return;
		const exit = exits[last.key];
		position--;
		history = history.slice(0, -1);
		flying = flying.filter((key) => key !== last.key);
		returning = exit ? { [last.key]: { ...exit, delay: 0 } } : {};
		message = `${getLabel(item)} restored.`;
		onUndo?.(item, last.decision);
	}
	function reset() {
		if (!history.length) return;
		const count = Math.min(4, items.length),
			back: Record<string, CardReturn> = {};
		items.slice(0, count).forEach((item, index) => {
			const key = getKey(item),
				exit = exits[key];
			if (exit && index < position) back[key] = { ...exit, delay: (count - 1 - index) * 0.06 };
		});
		position = 0;
		history = [];
		flying = [];
		returning = back;
		message = 'All cards are back in the stack.';
		onReset?.();
	}
	function release(key: string, offset: Point, velocity: Point, width: number) {
		const direction = Math.sign(offset.x);
		if (!direction || !top || getKey(top) !== key) return false;
		const flick =
				Math.abs(velocity.x) > 500 &&
				Math.sign(velocity.x) === direction &&
				Math.abs(offset.x) > 12,
			far =
				Math.abs(offset.x) > Math.min(width * 0.35, 140) &&
				!(Math.sign(velocity.x) === -direction && Math.abs(velocity.x) > 300);
		if (!flick && !far) return false;
		flings.set(key, velocity);
		decide(direction > 0 ? 'right' : 'left');
		return true;
	}
	function key(event: KeyboardEvent) {
		if (event.target !== event.currentTarget) return;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			decide(event.key === 'ArrowRight' ? 'right' : 'left');
		} else if (
			event.key === 'Backspace' ||
			((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z')
		) {
			event.preventDefault();
			undo();
		}
	}
	const decided = $derived(new Map(history.map((entry) => [entry.key, entry.decision]))),
		windowKeys = $derived(new Set(items.slice(position, position + 4).map(getKey))),
		rendered = $derived(
			items.filter((item) => windowKeys.has(getKey(item)) || flying.includes(getKey(item)))
		),
		empty = $derived(position >= items.length && flying.length === 0);
</script>

<div class={['arc-card-stack__root', className]}>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (The source exposes a focusable group for deck shortcuts.) -->
	<div
		class="arc-card-stack__stage"
		role="group"
		aria-roledescription="card stack"
		aria-label={label}
		aria-describedby={hintId}
		tabindex={0}
		onkeydown={key}
	>
		{#each rendered as item (getKey(item))}
			{@const id = getKey(item)}{@const index = items.indexOf(item)}{@const decision =
				decided.get(id) ?? null}{@const depth = decision ? 0 : index - position}
			<StackCard
				{id}
				{depth}
				{decision}
				returnFrom={returning[id]}
				interactive={!decision && depth === 0}
				zIndex={decision ? 20 + flying.indexOf(id) : 4 - depth}
				label={`${getLabel(item)}, ${index + 1} of ${items.length}`}
				{labels}
				{lift}
				{reduced}
				fling={(key) => {
					const velocity = flings.get(key);
					flings.delete(key);
					return velocity;
				}}
				onRelease={release}
				onThrown={(key, exit) => {
					exits[key] = exit;
				}}
				onGone={(key) => {
					flying = flying.filter((entry) => entry !== key);
				}}
				onLift={(value) => {
					lift = value;
				}}>{@render renderCard(item)}</StackCard
			>
		{/each}
		{#if empty}<div
				class="arc-card-stack__empty"
				in:swap={reduced
					? { duration: 150, skip: !mounted.current }
					: { y: 8, blur: 4, duration: 240, easing: m.ease.enter, skip: !mounted.current }}
				out:swap={{ duration: 120 }}
			>
				{#if renderEmpty}{@render renderEmpty(reset)}{:else}<p class="arc-card-stack__emptyTitle">
						All cards reviewed
					</p>
					<button type="button" class="arc-card-stack__control" onclick={reset}
						><RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />Start over</button
					>{/if}
			</div>{/if}
	</div>
	<div class="arc-card-stack__controls">
		<button
			type="button"
			class="arc-card-stack__control"
			aria-disabled={!top || undefined}
			onclick={() => {
				if (top) decide('left');
			}}><X size={16} strokeWidth={1.75} aria-hidden="true" />{labels.left}</button
		><button
			type="button"
			class="arc-card-stack__control"
			data-tone="quiet"
			aria-disabled={!history.length || undefined}
			onclick={() => {
				if (history.length) undo();
			}}
			><RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" /><span
				class="arc-card-stack__controlLabel">Undo</span
			></button
		><button
			type="button"
			class="arc-card-stack__control"
			data-tone="primary"
			aria-disabled={!top || undefined}
			onclick={() => {
				if (top) decide('right');
			}}><Check size={16} strokeWidth={1.75} aria-hidden="true" />{labels.right}</button
		>
	</div>
	<p id={hintId} class="arc-card-stack__srOnly">
		Drag the top card, or use the left and right arrow keys to {labels.left.toLowerCase()} or {labels.right.toLowerCase()}
		it. Backspace undoes the last decision.
	</p>
	<p class="arc-card-stack__srOnly" role="status" aria-live="polite">{message}</p>
</div>
