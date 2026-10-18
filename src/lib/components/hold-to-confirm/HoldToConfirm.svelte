<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, springCurve, TargetSpring, TimedTween } from '#lib/motion';
	import HoldFace from './HoldFace.svelte';
	import type { HoldToConfirmProps } from './types';
	import './hold-to-confirm.css';

	let {
		label,
		confirmedLabel = 'Done',
		onConfirm,
		duration = 1200,
		icon,
		tone = 'accent',
		confirmed,
		onHoldChange,
		class: className,
		disabled,
		ref = $bindable(null),
		...props
	}: HoldToConfirmProps = $props();
	const hintId = $props.id();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	let ownDone = $state(false),
		completions = $state(0),
		holding = $state(false);
	const done = $derived(confirmed ?? ownDone);
	const text = $derived(done ? confirmedLabel : label);
	const seconds = $derived((duration / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }));
	const progress = new TimedTween<number>(0);
	const scale = new TargetSpring(1, m.specs.snappy);
	const width = new TargetSpring(0, m.specs.morph);
	let measured = $state(false);
	let source: 'pointer' | 'key' | null = null;
	let pointerType = 'mouse';
	let generation = 0;
	const clipPath = $derived(
		`inset(0 ${((1 - Math.min(1, Math.max(0, progress.current))) * 100).toFixed(3)}% 0 0)`
	);

	function measure(node: HTMLSpanElement) {
		let lastText: string | null = null;
		let frame = 0;
		const observer = new ResizeObserver(([entry]) => {
			const next = entry?.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth;
			const morph = lastText !== null && lastText !== node.textContent && !reduced && measured;
			lastText = node.textContent;
			if (frame) cancelAnimationFrame(frame);
			const apply = () => {
				frame = 0;
				void width.set(next, { instant: !morph });
				measured = true;
			};
			// An observer runs after layout. Match the source's queued motion-value
			// render for instant changes; animated targets already wait for RAF.
			if (morph) apply();
			else frame = requestAnimationFrame(apply);
		});
		observer.observe(node);
		return () => {
			observer.disconnect();
			if (frame) cancelAnimationFrame(frame);
		};
	}
	function stopFill() {
		generation++;
		progress.stop();
	}
	function pressTo(pressed: boolean) {
		const depth = (ref?.offsetWidth ?? 0) > 220 ? 0.985 : 0.97;
		void scale.set(reduced ? 1 : pressed ? depth : 1, { instant: reduced });
	}
	function rewind() {
		stopFill();
		void progress.set(0, reduced ? { duration: 0 } : springCurve(m.specs.smooth, progress.current));
	}
	function stopHolding() {
		source = null;
		holding = false;
		onHoldChange?.(false);
		pressTo(false);
	}
	function complete() {
		if (!source) return;
		stopHolding();
		if (pointerType === 'touch') navigator.vibrate?.(12);
		ownDone = true;
		completions++;
		onConfirm();
	}
	function begin(from: 'pointer' | 'key') {
		if (done || disabled || source) return;
		source = from;
		holding = true;
		onHoldChange?.(true);
		pressTo(true);
		stopFill();
		const run = generation;
		void progress
			.set(1, { duration: (1 - progress.current) * duration, easing: (t) => t })
			.then(() => {
				if (run === generation) complete();
			});
	}
	function release() {
		if (!source) return;
		stopHolding();
		rewind();
	}
	$effect(() => {
		void done;
		void completions;
		untrack(() => {
			if (source) return;
			if (done && progress.current < 1) {
				stopFill();
				void progress.set(
					1,
					reduced ? { duration: 0 } : springCurve(m.specs.smooth, 1 - progress.current)
				);
			} else if (!done && progress.current > 0) rewind();
		});
	});
	onDestroy(() => {
		stopFill();
		width.destroy();
		void scale.set(scale.current, { instant: true });
	});
	function pointerDown(event: PointerEvent & { currentTarget: HTMLButtonElement }) {
		if (!event.isPrimary || event.button !== 0) return;
		pointerType = event.pointerType;
		event.currentTarget.setPointerCapture(event.pointerId);
		begin('pointer');
	}
	function pointerMove(event: PointerEvent & { currentTarget: HTMLButtonElement }) {
		if (source !== 'pointer') return;
		const box = event.currentTarget.getBoundingClientRect(),
			slack = 24;
		if (
			event.clientX < box.left - slack ||
			event.clientX > box.right + slack ||
			event.clientY < box.top - slack ||
			event.clientY > box.bottom + slack
		)
			release();
	}
	function keyDown(event: KeyboardEvent) {
		if (event.key !== ' ' && event.key !== 'Enter') return;
		event.preventDefault();
		if (!event.repeat) begin('key');
	}
	function keyUp(event: KeyboardEvent) {
		if (event.key !== ' ' && event.key !== 'Enter') return;
		event.preventDefault();
		if (source === 'key') release();
	}
</script>

<button
	{...props}
	bind:this={ref}
	type="button"
	class={['arc-hold-to-confirm__button', className]}
	data-tone={tone}
	data-state={done ? 'done' : holding ? 'holding' : 'idle'}
	{disabled}
	aria-disabled={done || undefined}
	aria-label={text}
	aria-describedby={done ? undefined : hintId}
	style:scale={scale.current}
	onpointerdown={pointerDown}
	onpointermove={pointerMove}
	onpointerup={release}
	onpointercancel={release}
	onlostpointercapture={release}
	onkeydown={keyDown}
	onkeyup={keyUp}
	onblur={release}
	oncontextmenu={(event) => event.preventDefault()}
>
	<HoldFace {icon} {text} {done} width={measured ? width.current : undefined} {reduced} {measure} />
	<span class="arc-hold-to-confirm__fill" style:clip-path={clipPath} aria-hidden="true">
		<HoldFace {icon} {text} {done} width={measured ? width.current : undefined} {reduced} />
	</span>
</button>
<span id={hintId} class="arc-hold-to-confirm__srOnly"
	>{`Press and hold for ${seconds} seconds to confirm. With a keyboard, hold Space or Enter.`}</span
>
<span class="arc-hold-to-confirm__srOnly" role="status">{done ? confirmedLabel : ''}</span>
