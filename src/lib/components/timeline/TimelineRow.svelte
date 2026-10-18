<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import {
		heightPresence,
		inView,
		motionTokens as m,
		swap,
		springCurve,
		easeInOut,
		Mounted
	} from '#lib/motion';
	import type { Row } from './types';
	import RiseText from './RiseText.svelte';
	let {
		row,
		last,
		expanded,
		onToggle,
		timeLabel,
		timeFull,
		fresh,
		reduced,
		schedule
	}: {
		row: Row;
		last: boolean;
		expanded: boolean;
		onToggle: () => void;
		timeLabel: string;
		timeFull: string;
		fresh: boolean;
		reduced: boolean;
		schedule: () => number;
	} = $props();
	const detailId = $props.id();
	const mounted = new Mounted();
	let revealDelay = $state<number | null>(null);
	const delay = $derived((revealDelay ?? 0) + (fresh ? 120 : 0));
	const scale = new Tween(0.4),
		opacity = new Tween(0),
		draw = new Tween(0);
	const rotation = new Tween(untrack(() => (expanded ? 180 : 0)));
	$effect(() => {
		void rotation.set(expanded ? 180 : 0, {
			...m.spring.snappy,
			duration: reduced ? 0 : m.spring.snappy.duration
		});
	});
	$effect(() => {
		if (revealDelay === null) return;
		void scale.set(1, {
			...springCurve({ visualDuration: 0.36, bounce: 0.32 }, 0.6),
			duration: reduced ? 0 : springCurve({ visualDuration: 0.36, bounce: 0.32 }, 0.6).duration,
			delay: reduced ? 0 : delay
		});
		void opacity.set(1, {
			duration: reduced ? 150 : m.duration.fast,
			easing: reduced ? easeInOut : m.ease.enter,
			delay: reduced ? 0 : delay
		});
		void draw.set(1, {
			...springCurve({ visualDuration: 0.34, bounce: 0 }, 1),
			duration: reduced ? 0 : springCurve({ visualDuration: 0.34, bounce: 0 }, 1).duration,
			delay: reduced ? 0 : delay + 100
		});
	});
	const firstFresh = untrack(() => fresh);
	const tone = $derived(row.avatar ? undefined : (row.tone ?? 'neutral'));
	const exitSpring = $derived(springCurve({ visualDuration: 0.3, bounce: 0 }));
</script>

<li
	class="arc-timeline__item"
	data-entering={firstFresh || undefined}
	onintroend={(event) => delete event.currentTarget.dataset.entering}
	in:heightPresence|global={{ reduced, opacity: false, skip: !firstFresh }}
	out:heightPresence|global={{
		reduced,
		reducedDuration: 100,
		spring: exitSpring,
		fade: { duration: 120, easing: easeInOut }
	}}
	{@attach inView({
		once: true,
		amount: 0.2,
		onChange: (visible) => {
			if (visible && revealDelay === null) revealDelay = schedule();
		}
	})}
>
	<span
		class="arc-timeline__marker"
		data-tone={tone}
		aria-hidden="true"
		style:transform={`scale(${scale.current})`}
		style:opacity={Math.min(1, Math.max(0, opacity.current))}
	>
		{#if row.avatar}<img
				src={row.avatar}
				alt=""
				width={28}
				height={28}
				decoding="async"
			/>{:else}{@render row.icon?.()}{/if}
	</span>
	{#if !last}<span
			class="arc-timeline__segment"
			aria-hidden="true"
			style:transform={`scaleY(${draw.current})`}
		></span>{/if}
	<div
		class="arc-timeline__content"
		in:swap|global={{
			y: reduced ? 0 : -10,
			blur: reduced ? 0 : m.blur.soft,
			...m.spring.smooth,
			duration: reduced ? 150 : m.spring.smooth.duration,
			fade: {
				duration: reduced ? 150 : m.duration.standard,
				easing: m.ease.enter,
				delay: reduced ? 0 : 50
			},
			skip: !firstFresh
		}}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -- The click handler is attached only when this element is a native button. -->
		<svelte:element
			this={row.detail ? 'button' : 'div'}
			class="arc-timeline__trigger"
			type={row.detail ? 'button' : undefined}
			data-timeline-trigger={row.detail ? '' : undefined}
			aria-expanded={row.detail ? expanded : undefined}
			aria-controls={row.detail && expanded ? detailId : undefined}
			onclick={row.detail ? onToggle : undefined}
		>
			<span class="arc-timeline__text"
				><span class="arc-timeline__title"
					>{#if row.actor}<span class="arc-timeline__actor">{row.actor}</span>{' '}
					{/if}{row.title}</span
				>{#if row.meta}<span class="arc-timeline__meta">{row.meta}</span>{/if}</span
			>
			<time class="arc-timeline__time" datetime={new Date(row.time).toISOString()} title={timeFull}
				><RiseText text={timeLabel} {reduced} /><span class="arc-timeline__sr-only">{timeFull}</span
				></time
			>
			{#if row.detail}<span
					class="arc-timeline__chevron"
					aria-hidden="true"
					style:transform={`rotate(${rotation.current}deg)`}
					><ChevronDown size={16} strokeWidth={1.75} /></span
				>{/if}
		</svelte:element>
		{#if expanded && row.detail}<div
				id={detailId}
				class="arc-timeline__detail"
				in:heightPresence={{ reduced, opacity: false, skip: !mounted.current }}
				out:heightPresence={{
					reduced,
					opacity: false,
					spring: springCurve({ visualDuration: 0.28, bounce: 0 })
				}}
			>
				<div
					class="arc-timeline__detail-inner"
					in:swap|global={{
						y: reduced ? 0 : -4,
						blur: reduced ? 0 : m.blur.soft,
						duration: reduced ? 150 : m.duration.standard,
						easing: m.ease.enter,
						delay: reduced ? 0 : 60,
						skip: !mounted.current
					}}
					out:swap|global={{ duration: m.duration.instant, easing: m.ease.standard }}
				>
					{#if typeof row.detail === 'function'}{@render row.detail()}{:else}{row.detail}{/if}
				</div>
			</div>{/if}
	</div>
</li>
