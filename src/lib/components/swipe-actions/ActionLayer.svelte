<script lang="ts">
	import type { SwipeAction, Side } from './types';
	let {
		action,
		side,
		rank,
		count,
		coverRank,
		x,
		cover,
		onPress
	}: {
		action: SwipeAction;
		side: Side;
		rank: number;
		count: number;
		coverRank: number | null;
		x: number;
		cover: number;
		onPress: () => void;
	} = $props();
	const direction = $derived(side === 'leading' ? 1 : -1);
	const revealed = $derived(Math.max(0, x * direction));
	const share = $derived(revealed / count);
	const base = $derived((count - rank) * share);
	const inset = $derived(
		coverRank === rank
			? base + cover * (revealed - base)
			: coverRank !== null && rank > coverRank
				? base * (1 - cover)
				: base
	);
	const glyph = $derived(
		-direction * (coverRank === rank ? share / 2 + cover * (38 - share / 2) : share / 2)
	);
	const clamp = (n: number) => Math.min(1, Math.max(0, n));
	const reveal = (own: number) =>
		coverRank === rank ? Math.max(own, cover) : coverRank === null ? own : own * (1 - cover);
	const icon = $derived(reveal(clamp((share - 76 * 0.25) / (76 * 0.55))));
	const label = $derived(reveal(clamp((share - 76 * 0.72) / (76 * 0.24))));
</script>

<button
	type="button"
	tabindex={-1}
	aria-hidden="true"
	class="arc-swipe-actions__layer"
	data-side={side}
	data-tone={action.tone ?? 'neutral'}
	style:transform="translateX({direction * inset}px)"
	style:z-index={rank + 1}
	onclick={onPress}
>
	<span class="arc-swipe-actions__anchor" style:transform="translateX({glyph}px)"
		><span class="arc-swipe-actions__glyph"
			><span
				class="arc-swipe-actions__icon"
				style:opacity={icon}
				style:transform="scale({0.6 + 0.4 * icon})">{@render action.icon()}</span
			><span class="arc-swipe-actions__label" style:opacity={label}>{action.label}</span></span
		></span
	>
</button>
