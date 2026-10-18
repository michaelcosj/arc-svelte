<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { WidthMorph, Mounted, inView, motionTokens as m, swap } from '#lib/motion';
	import type { Attachment } from 'svelte/attachments';
	import type { TextShimmerProps } from './types';
	import './text-shimmer.css';
	let {
		text,
		active = true,
		duration = 1.8,
		as = 'span',
		class: className,
		id
	}: TextShimmerProps = $props();
	const mounted = new Mounted();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const sweep = new Tween(0);
	const settle = new Tween(untrack(() => (active ? 0 : 1)));
	let visible = $state(false);
	let pageVisible = $state(true);
	const running = $derived(active && !reduced && visible && pageVisible);
	const width = new WidthMorph(() => ({ reduced }));
	$effect.pre(() => {
		void text;
		width.changed();
	});
	const visibility: Attachment<HTMLElement> = (node) => {
		const cleanup = inView({ margin: '64px', onChange: (value) => (visible = value) })(node);
		const read = () => (pageVisible = document.visibilityState === 'visible');
		read();
		document.addEventListener('visibilitychange', read);
		return () => {
			cleanup?.();
			document.removeEventListener('visibilitychange', read);
		};
	};
	$effect(() => {
		const run = running;
		const seconds = duration;
		const reduce = reduced;
		return untrack(() => {
			if (reduce) void sweep.set(0, { duration: 0 });
			if (!run) return;
			let alive = true;
			let timer: ReturnType<typeof setTimeout>;
			const loop = async () => {
				let delay = sweep.current > 0 ? 0 : 120;
				while (alive) {
					if (sweep.current >= 1) await sweep.set(0, { duration: 0 });
					await sweep.set(1, {
						duration: Math.max(0, seconds * 1000 * (1 - sweep.current)),
						delay,
						easing: (t) => t
					});
					if (!alive) break;
					await sweep.set(0, { duration: 0 });
					await new Promise<void>(
						(resolve) => (timer = setTimeout(resolve, Math.max(16, seconds * 320)))
					);
					delay = 0;
				}
			};
			void loop();
			return () => {
				alive = false;
				clearTimeout(timer);
				void sweep.set(sweep.current, { duration: 0 });
			};
		});
	});
	$effect(() => {
		const busy = active;
		const reduce = reduced;
		const seconds = duration;
		untrack(() => {
			if (!busy) {
				const t = sweep.current;
				if (!reduce && t > 0 && t < 1)
					void sweep.set(1, {
						duration: Math.min(420, seconds * 1000 * (1 - t) * 0.5),
						easing: m.ease.enter
					});
			}
			void settle.set(busy ? 0 : 1, {
				duration: busy ? (reduce ? 0 : m.duration.standard) : reduce ? m.duration.instant : 360,
				easing: m.ease.standard
			});
		});
	});
	const background = $derived.by(() => {
		const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
		const base = `color-mix(in oklab, var(--ts-highlight) ${percent(settle.current)}, var(--ts-base))`;
		const t = sweep.current;
		const stops = [
			[-1, 0],
			[-0.5, 0.5],
			[-0.2, 0.9],
			[0, 1],
			[0.2, 0.9],
			[0.5, 0.5],
			[1, 0]
		].map(
			([offset, strength]) =>
				`color-mix(in oklab, var(--ts-highlight) ${percent(strength!)}, ${base}) calc(${(t * 100).toFixed(2)}% + ${((2 * t - 1 + offset!) * 2.2).toFixed(3)}em)`
		);
		return `linear-gradient(90deg, ${base}, ${stops.join(', ')}, ${base})`;
	});
</script>

<svelte:element
	this={as}
	{id}
	class={['arc-text-shimmer', className]}
	data-state={active ? 'active' : 'idle'}
	aria-busy={active || undefined}
>
	<span class="arc-text-shimmer__stage" {@attach width.body} {@attach visibility}
		><span class="arc-text-shimmer__measure" {@attach width.content}
			>{#key text}<span
					class="arc-text-shimmer__label"
					style:background-image={background}
					in:swap={{
						y: reduced ? 0 : '.3em',
						blur: reduced ? 0 : m.blur.soft,
						duration: reduced ? m.duration.instant : m.duration.standard,
						easing: m.ease.enter,
						skip: !mounted.current
					}}
					out:swap={{
						y: reduced ? 0 : '-.24em',
						blur: reduced ? 0 : m.blur.subtle,
						duration: reduced ? m.duration.instant : m.duration.fast,
						easing: reduced ? undefined : m.ease.standard,
						pop: true
					}}>{text}</span
				>{/key}</span
		></span
	>
</svelte:element>
