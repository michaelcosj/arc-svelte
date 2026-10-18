<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		HeightMorph,
		WidthMorph,
		Mounted,
		inView,
		motionTokens as m,
		swap,
		widthPresence
	} from '#lib/motion';
	import type { CountdownProps } from './types';
	import {
		DEFAULT_UNITS,
		NAMES,
		MAX_TIMEOUT,
		systemClock,
		toEpoch,
		partsFor,
		basesFor
	} from './time';
	import Wheel from './CountdownWheel.svelte';
	import './countdown.css';
	let {
		target,
		timeZone,
		units = DEFAULT_UNITS,
		variant = 'large',
		completeLabel = 'Live now',
		onComplete,
		label = 'Time remaining',
		clock = systemClock,
		ref = $bindable(null),
		class: className
	}: CountdownProps = $props();
	const mounted = new Mounted();
	const reduced = $derived(Boolean(prefersReducedMotion.current) && mounted.current);
	const end = $derived(toEpoch(target, timeZone));
	const valid = $derived(Number.isFinite(end));
	const shownUnits = $derived(
		units.length
			? [...units].sort((a, b) => DEFAULT_UNITS.indexOf(a) - DEFAULT_UNITS.indexOf(b))
			: DEFAULT_UNITS
	);
	let pageVisible = $state(true),
		seen = $state(false),
		now = $state<number | null>(null);
	const running = $derived(pageVisible && seen && valid);
	$effect(() => {
		const update = () => (pageVisible = document.visibilityState === 'visible');
		update();
		document.addEventListener('visibilitychange', update);
		return () => document.removeEventListener('visibilitychange', update);
	});
	$effect(() => {
		const deadline = end;
		if (!running) return;
		let timer: ReturnType<typeof setTimeout>;
		const tick = () => {
			const time = untrack(clock);
			now = time;
			const left = deadline - time;
			if (left > 0) timer = setTimeout(tick, (left % 1000 || 1000) + 8);
		};
		timer = setTimeout(tick, 0);
		return () => clearTimeout(timer);
	});
	$effect(() => {
		const deadline = end;
		if (!valid) return;
		const left = deadline - untrack(clock);
		if (left <= 0) return;
		const timer = setTimeout(() => (now = untrack(clock)), Math.min(MAX_TIMEOUT, left + 8));
		return () => clearTimeout(timer);
	});
	const left = $derived(now === null || !valid ? null : Math.max(0, end - now));
	const complete = $derived(left === 0);
	let wasRunning: number | null = null;
	$effect(() => {
		const remaining = left,
			deadline = end;
		untrack(() => {
			if (remaining === null) return;
			if (remaining > 0) {
				wasRunning = deadline;
				return;
			}
			if (wasRunning === deadline) {
				wasRunning = null;
				onComplete?.();
			}
		});
	});
	const seconds = $derived(left === null ? 0 : Math.ceil(left / 1000));
	const parts = $derived(partsFor(seconds, shownUnits));
	const pending = $derived(left === null);
	const compact = $derived(variant === 'compact');
	const spoken = $derived(
		complete
			? typeof completeLabel === 'string'
				? completeLabel
				: 'Complete'
			: pending
				? ''
				: parts
						.filter((part, i) => part.value > 0 || i === parts.length - 1)
						.filter((part) => seconds < 60 || part.unit !== 'seconds')
						.map((part) => `${part.value} ${NAMES[part.unit][2]}${part.value === 1 ? '' : 's'}`)
						.join(', ')
	);
	const width = new WidthMorph(() => ({ reduced, follow: true, pinned: true, measure: 'offset' }));
	const height = new HeightMorph(() => ({
		reduced,
		follow: true,
		pinned: true,
		measure: 'offset',
		clip: false
	}));
	const enter = $derived(
		reduced
			? { duration: m.duration.fast, skip: !mounted.current }
			: { scale: 0.92, blur: m.blur.soft, ...m.spring.morph, skip: !mounted.current }
	);
	const exit = $derived(
		reduced
			? { duration: m.duration.fast, pop: true }
			: { scale: 0.92, blur: m.blur.soft, duration: m.duration.fast, pop: true }
	);
</script>

<div
	bind:this={ref}
	class={['arc-countdown', className]}
	data-variant={variant}
	data-complete={complete || undefined}
	data-pending={pending || undefined}
	role="timer"
	aria-label={label}
	{@attach inView({ amount: 0, onChange: (value) => (seen = value) })}
>
	<div class="arc-countdown__shell" {@attach width.body} {@attach height.body}>
		<div
			class="arc-countdown__content"
			aria-hidden="true"
			{@attach width.content}
			{@attach height.content}
		>
			{#if complete}<span class="arc-countdown__done" in:swap={enter} out:swap={exit}
					><span class="arc-countdown__pulse"
					></span>{#if typeof completeLabel === 'function'}{@render completeLabel()}{:else}{completeLabel}{/if}</span
				>
			{:else}<span class="arc-countdown__units" in:swap={enter} out:swap={exit}>
					{#each parts as part, group (part.unit)}
						{@const text = String(part.value).padStart(2, '0')}
						{@const bases = basesFor(part.unit, group === 0, text.length)}
						<span class="arc-countdown__unit">
							{#if !compact && group > 0}<span class="arc-countdown__colon">:</span>{/if}
							<span class="arc-countdown__group"
								><span class="arc-countdown__number">
									{#each [...text] as char, index (`${part.unit}${text.length - index}`)}<span
											class="arc-countdown__wheel"
											in:widthPresence={{ skip: reduced || !mounted.current }}
											out:widthPresence={{ skip: reduced }}
											><Wheel
												digit={Number(char)}
												base={bases[index]!}
												delay={Math.min((group * 2 + index) * m.stagger.item, 300)}
												{reduced}
											/></span
										>{/each}
								</span><span class="arc-countdown__name">{NAMES[part.unit][compact ? 1 : 0]}</span
								></span
							>
						</span>
					{/each}
				</span>{/if}
		</div>
	</div>
	<span class="arc-countdown__sr-only">{spoken}</span>
</div>
