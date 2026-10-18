<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { SlotTextProps } from './types';
	import Reel from './Reel.svelte';
	import './slot-text.css';
	let {
		value,
		format,
		duration = 0.9,
		stagger = 0.07,
		spins = 1,
		align,
		announce = false,
		class: className,
		style
	}: SlotTextProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const text = $derived(
		typeof value === 'number' ? (format ? format(value) : value.toLocaleString('en-US')) : value
	);
	const fromEnd = $derived((align ?? (typeof value === 'number' ? 'end' : 'start')) === 'end');
	const chars = $derived(Array.from(text));
	const lead = $derived(fromEnd ? chars.findIndex((char) => /[\p{L}\p{N}]/u.test(char)) : 0);
	const prefix = $derived(lead < 0 ? chars.length : lead);
	const keyOf = (i: number) =>
		i < prefix ? `p${i}` : fromEnd ? `e${chars.length - 1 - i}` : `s${i}`;
	const initialKeys = untrack(() => new Set(chars.map((_, i) => keyOf(i))));
	let previous = untrack(() => value);
	let rising = $state(true);
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (previous !== next) {
				rising = typeof next === 'number' && typeof previous === 'number' ? next >= previous : true;
				previous = next;
			}
		});
	});
</script>

<span class={['arc-slot-text', className]} {style}
	><span class="arc-slot-text__sr-only" aria-live={announce ? 'polite' : undefined}>{text}</span
	><span class="arc-slot-text__reels" aria-hidden="true"
		>{#each chars as char, i (keyOf(i))}<Reel
				{char}
				order={i}
				entering={!initialKeys.has(keyOf(i))}
				{rising}
				{duration}
				{stagger}
				{spins}
				{reduced}
			/>{/each}</span
	></span
>
