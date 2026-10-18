<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { cssEasing, easeOut, springCurve, motionTokens as m } from '#lib/motion';

	let {
		value,
		reduced,
		kind,
		children
	}: {
		value: string | boolean;
		reduced: boolean;
		kind: 'glyph' | 'word';
		children: Snippet<[string | boolean]>;
	} = $props();
	// Keep exiting keys available for resurrection. Svelte transition progress otherwise shortens
	// a reversed clock, whereas the reference starts a full-duration tween from the painted value.
	type Entry = { key: string | boolean; present: boolean; initial: boolean };
	let entries = $state<Entry[]>(untrack(() => [{ key: value, present: true, initial: true }]));
	$effect(() => {
		const key = value;
		untrack(() => {
			for (const entry of entries) entry.present = entry.key === key;
			if (!entries.some((entry) => entry.key === key)) {
				entries.push({ key, present: true, initial: false });
			}
		});
	});

	function presence(entry: Entry) {
		return (node: HTMLSpanElement) => {
			let fresh = true;
			$effect(() => {
				const present = entry.present,
					reduce = reduced;
				return untrack(() => {
					const glyph = kind === 'glyph';
					if (fresh) {
						if (!entry.initial) {
							node.style.opacity = '0';
							node.style.transform = reduce ? 'none' : glyph ? 'scale(.55)' : 'translateY(.5em)';
							node.style.filter = `blur(${reduce ? 0 : glyph ? 2 : 4}px)`;
						}
						fresh = false;
					}
					const style = getComputedStyle(node);
					const from = {
						opacity: style.opacity,
						transform: style.transform,
						filter: style.filter
					};
					const target = {
						opacity: present ? '1' : '0',
						transform: reduce
							? 'none'
							: glyph
								? `scale(${present ? 1 : 0.55})`
								: `translateY(${present ? 0 : -0.4}em)`,
						filter: `blur(${reduce || present ? 0 : 2}px)`
					};
					const duration = reduce ? 120 : present && !glyph ? 240 : 160;
					const ease = reduce ? easeOut : present ? m.ease.enter : m.ease.standard;
					const easing = cssEasing(ease);
					const animations: Animation[] = [];
					const samplers: Partial<
						Record<'opacity' | 'transform' | 'filter', (elapsed: number) => string>
					> = {};
					const started = performance.now();
					const matrix = new DOMMatrix(from.transform === 'none' ? undefined : from.transform);
					const fontSize = parseFloat(style.fontSize);
					const unchanged = {
						opacity: +from.opacity === +target.opacity,
						filter:
							parseFloat(from.filter.match(/[\d.]+/)?.[0] ?? '0') === (reduce || present ? 0 : 2),
						transform: glyph
							? Math.abs(matrix.a - (reduce || present ? 1 : 0.55)) < 0.00001
							: Math.abs(matrix.f - (reduce || present ? 0 : -0.4 * fontSize)) < 0.00001
					};
					for (const property of ['opacity', 'transform', 'filter'] as const) {
						node.style[property] = target[property];
						if (unchanged[property]) continue;
						const spring =
							property === 'transform' && glyph && present && !reduce
								? springCurve(m.specs.snappy, Math.abs(1 - matrix.a))
								: undefined;
						const animation = node.animate(
							[{ [property]: from[property] }, { [property]: target[property] }],
							{
								duration: spring?.duration ?? duration,
								easing: spring ? cssEasing(spring.easing) : easing,
								fill: 'both'
							}
						);
						const timing = spring?.easing ?? ease;
						const length = spring?.duration ?? duration;
						samplers[property] = (elapsed) => {
							const p = timing(Math.min(1, Math.max(0, elapsed / length)));
							if (property === 'opacity')
								return String(
									Math.min(1, Math.max(0, +from.opacity + (+target.opacity - +from.opacity) * p))
								);
							if (property === 'filter') {
								const value = parseFloat(from.filter.match(/[\d.]+/)?.[0] ?? '0');
								return `blur(${Math.max(0, value + ((reduce || present ? 0 : 2) - value) * p)}px)`;
							}
							if (reduce) return 'none';
							return glyph
								? `scale(${matrix.a + ((present ? 1 : 0.55) - matrix.a) * p})`
								: `translateY(${matrix.f + ((present ? 0 : -0.4 * fontSize) - matrix.f) * p}px)`;
						};
						animations.push(animation);
					}
					let cancelled = false;
					void Promise.all(animations.map((animation) => animation.finished))
						.then(() => {
							if (!cancelled && !entry.present)
								entries = entries.filter((candidate) => candidate !== entry);
						})
						.catch(() => {});
					return () => {
						cancelled = true;
						// Sample before cancellation at the event time. A timer can interrupt between
						// RAFs; the source advances its outgoing animation to that time as it stops.
						// A pending WAAPI animation has never painted. Sampling wall time here
						// would invent a visible frame during a zero-duration confirmation.
						const elapsed = animations.every((animation) => animation.startTime === null)
							? 0
							: Math.max(0, performance.now() - started);
						const frame = { ...target };
						for (const property of ['opacity', 'transform', 'filter'] as const)
							frame[property] = samplers[property]?.(elapsed) ?? target[property];
						animations.forEach((animation) => animation.cancel());
						Object.assign(node.style, frame);
					};
				});
			});
		};
	}
</script>

{#each entries as entry (entry.key)}
	<span
		class="arc-expanding-button-group__{kind}"
		aria-hidden={entry.present ? undefined : 'true'}
		inert={!entry.present}
		{@attach presence(entry)}
	>
		{@render children(entry.key)}
	</span>
{/each}
