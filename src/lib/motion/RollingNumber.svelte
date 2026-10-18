<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m } from './tokens';
	import { swap } from './swap';
	import { PopLayout } from './pop-layout';
	import { Mounted } from './mounted.svelte';
	import { widthPresence, type WidthPresenceParams } from './width-presence';

	/**
	 * A count in running copy ("12 characters"): only the digits that changed roll, up when the
	 * number grows and down when it shrinks, and a gained or lost digit opens or closes its width.
	 */
	let { word }: { word: string } = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const parse = (value: string) => parseFloat(value.replace(/,/g, ''));
	let previous = untrack(() => word);
	let direction = $state(1);
	let root = $state<HTMLElement>();
	const layout = new PopLayout();

	// Before the DOM changes: pick the roll direction and measure digits that may pop out.
	$effect.pre(() => {
		const next = word;
		untrack(() => {
			if (next === previous) return;
			direction = parse(next) < parse(previous) ? -1 : 1;
			previous = next;
			layout.capture(root);
		});
	});

	// Columns are keyed from the right, so the ones digit stays the ones digit as the number grows.
	const columns = $derived(
		word.split('').map((character, index, all) => ({ key: all.length - index, character }))
	);

	/** Width springs open (morph) while opacity fades (fast); closing reverses both. */
	const column = $derived<WidthPresenceParams>({
		skip: reduced || !mounted.current,
		fade: { duration: m.duration.fast, easing: m.ease.inOut }
	});

	const digitIn = $derived(
		reduced
			? { skip: true }
			: {
					skip: !mounted.current,
					y: `${direction * 0.6}em`,
					blur: m.blur.subtle,
					...m.spring.snappy,
					fade: { duration: m.duration.fast }
				}
	);
	const digitOut = (key: number) =>
		reduced
			? { skip: true }
			: {
					y: `${direction * -0.6}em`,
					blur: m.blur.subtle,
					...m.spring.snappy,
					fade: { duration: m.duration.fast },
					pop: layout.box(key)
				};
</script>

<span bind:this={root} style:display="contents">
	{#each columns as { key, character } (key)}
		<span class="arc-rolling-number__column" in:widthPresence={column} out:widthPresence={column}>
			{#key character}
				<span data-pop-key={key} in:swap={digitIn} out:swap={digitOut(key)}>{character}</span>
			{/key}
		</span>
	{/each}
</span>
