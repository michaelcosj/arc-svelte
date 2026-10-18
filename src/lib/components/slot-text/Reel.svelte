<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicBezier, springCurve } from '#lib/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import type { ReelProps } from './types';
	import { buildStrip } from './strip';
	let { char, order, entering, rising, duration, stagger, spins, reduced }: ReelProps = $props();
	const landing = cubicBezier(0.12, 0.8, 0.16, 1);
	const pos = new Tween(0);
	const width = new Tween(0);
	let placed = $state(false);
	let sizer = $state<HTMLSpanElement>();
	let reel = $state.raw(
		untrack(() => ({
			char,
			strip:
				entering && !reduced
					? buildStrip('', char, spins, rising, char.charCodeAt(0) + order)
					: [char],
			from: 0,
			grow: entering,
			time: duration + order * stagger
		}))
	);
	$effect.pre(() => {
		const next = char;
		const index = order;
		const time = duration + order * stagger;
		const turns = spins;
		const ascending = rising;
		const reduce = reduced;
		untrack(() => {
			if (reel.char === next) return;
			const current = pos.current;
			const cell = Math.max(0, Math.min(reel.strip.length - 1, Math.round(current)));
			const visible = reel.strip[cell]!;
			reel = {
				char: next,
				strip: reduce
					? [next]
					: buildStrip(
							visible,
							next,
							turns,
							ascending,
							next.charCodeAt(0) * 31 + visible.charCodeAt(0) * 7 + index + reel.strip.length
						),
				from: reduce ? 0 : current - cell,
				grow: false,
				time
			};
		});
	});
	$effect(() => {
		const current = reel;
		const reduce = reduced;
		const node = sizer;
		untrack(() => {
			if (!node) return;
			const measured = node.getBoundingClientRect().width;
			const last = current.strip.length - 1;
			if (reduce) {
				void pos.set(last, { duration: 0 });
				void width.set(measured, { duration: 0 });
				placed = true;
				return;
			}
			void pos.set(current.from, { duration: 0 });
			void pos.set(last, {
				duration: last === 0 ? 200 : Math.max(0, current.time * 1000),
				easing: landing
			});
			if (current.grow) void width.set(0, { duration: 0 });
			if (!placed && !current.grow) void width.set(measured, { duration: 0 });
			else
				void width.set(
					measured,
					springCurve(
						{ visualDuration: Math.min(current.time, 0.6), bounce: 0 },
						Math.abs(measured - width.current)
					)
				);
			placed = true;
		});
	});
	// Hydration can precede the local font download; correct that first measurement without replaying a reel.
	$effect(() => {
		const node = sizer;
		if (!node || document.fonts.status !== 'loading') return;
		let alive = true;
		void document.fonts.ready.then(() => {
			if (alive) void width.set(node.getBoundingClientRect().width, { duration: 0 });
		});
		return () => {
			alive = false;
		};
	});
	let blur = $state('none');
	let previous = 0;
	let previousTime = 0;
	$effect(() => {
		const current = pos.current;
		let timer: ReturnType<typeof setTimeout>;
		untrack(() => {
			const now = performance.now();
			const velocity = previousTime
				? (1000 * (current - previous)) / Math.max(1, now - previousTime)
				: 0;
			const amount = Math.min(Math.abs(velocity) * 0.05, 2.4);
			blur = amount < 0.15 ? 'none' : `blur(${amount.toFixed(2)}px)`;
			previous = current;
			previousTime = now;
			timer = setTimeout(() => (blur = 'none'), 50);
		});
		return () => clearTimeout(timer);
	});
	function shrink(node: HTMLElement): TransitionConfig {
		node.dataset.exiting = '';
		const size = node.getBoundingClientRect().width;
		const curve = springCurve({ visualDuration: 0.35, bounce: 0 }, size);
		return {
			duration: reduced ? 0 : curve.duration,
			easing: curve.easing,
			css: (t) => `width:${size * t}px`
		};
	}
</script>

<span
	class="arc-slot-text__slot"
	style:width={placed ? `${width.current}px` : undefined}
	out:shrink|global
>
	<span bind:this={sizer} class="arc-slot-text__sizer">{char === ' ' ? '\u00a0' : char}</span>
	<span class="arc-slot-text__window"
		><span
			class="arc-slot-text__strip"
			style:transform={`translate3d(0, ${(-pos.current * 1.6).toFixed(4)}em, 0)`}
			style:filter={blur}
			>{#each reel.strip as cell, index (index)}<span class="arc-slot-text__cell"
					>{cell === ' ' ? '\u00a0' : cell}</span
				>{/each}</span
		></span
	>
</span>
