<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import X from '@lucide/svelte/icons/x';
	import {
		Mounted,
		heightPresence,
		motionTokens as m,
		springCurve,
		springOptions
	} from '#lib/motion';
	import type { AnnouncementBarProps } from './types';
	import Slides from './Slides.svelte';
	import { storageKey } from './storage';
	import './announcement-bar.css';
	let {
		messages,
		id,
		open,
		defaultOpen = true,
		onOpenChange,
		index,
		defaultIndex = 0,
		onIndexChange,
		interval = 6000,
		autoPlay = true,
		controls = false,
		dismissible = true,
		tone = 'neutral',
		onAction,
		onCountdownEnd,
		label = 'Announcements',
		class: className,
		ref = $bindable(null)
	}: AnnouncementBarProps = $props();
	const uid = $props.id(),
		mounted = new Mounted();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	let openInternal = $state(untrack(() => defaultOpen)),
		remembered = $state(false),
		indexInternal = $state(untrack(() => defaultIndex)),
		direction = $state(1);
	$effect.pre(() => {
		const key = id,
			controlled = open !== undefined;
		if (!key || controlled) return;
		try {
			if (window.localStorage.getItem(storageKey(key)) === 'dismissed') remembered = true;
		} catch {
			/* Storage can be blocked. */
		}
	});
	const shown = $derived(open ?? (openInternal && !remembered)),
		total = $derived(messages.length);
	const current = $derived(total ? (((index ?? indexInternal) % total) + total) % total : 0);
	const announcement = $derived(messages[current]);
	function dismiss() {
		if (id) {
			try {
				window.localStorage.setItem(storageKey(id), 'dismissed');
			} catch {
				/* Storage can be blocked. */
			}
		}
		if (open === undefined) openInternal = false;
		onOpenChange?.(false);
	}
	function go(step: number) {
		if (total < 2) return;
		const next = (((current + step) % total) + total) % total;
		direction = step > 0 ? 1 : -1;
		if (index === undefined) indexInternal = next;
		onIndexChange?.(next);
	}
	let userPaused = $state(false),
		hovered = $state(false),
		focused = $state(false),
		hidden = $state(false);
	onMount(() => {
		const read = () => (hidden = document.visibilityState === 'hidden');
		document.addEventListener('visibilitychange', read);
		return () => document.removeEventListener('visibilitychange', read);
	});
	const rotating = $derived(autoPlay && !reduced && total > 1),
		running = $derived(rotating && shown && !userPaused && !hovered && !focused && !hidden);
	let progress = $state(0);
	$effect.pre(() => {
		void current;
		untrack(() => {
			progress = 0;
		});
	});
	$effect(() => {
		const active = running;
		void current;
		const duration = interval;
		if (!active) return;
		const initial = untrack(() => progress),
			start = performance.now();
		let frame: number;
		const tick = (time: number) => {
			progress = duration > 0 ? Math.min(1, initial + (time - start) / duration) : 1;
			if (progress >= 1) {
				untrack(() => go(1));
				return;
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});
	const height = new Spring(32, {
		...springOptions({ visualDuration: 0.42, bounce: 0 }),
		precision: 0.5
	});
	let measured = 0;
	function onSize(next: number) {
		if (Math.abs(next - measured) < 0.5) return;
		const first = measured === 0;
		measured = next;
		void height.set(next, { instant: first || reduced });
	}
	const navigable = $derived(controls && total > 1);
	const controlCount = $derived((navigable ? 2 + (rotating ? 1 : 0) : 0) + (dismissible ? 1 : 0));
	const collapse = springCurve({ visualDuration: 0.44, bounce: 0 });
	const RING = 2 * Math.PI * 8;
</script>

{#if announcement && shown}<section
		bind:this={ref}
		class={['arc-announcement-bar', className]}
		aria-label={label}
		aria-roledescription={total > 1 ? 'carousel' : undefined}
		in:heightPresence={{
			reduced,
			reducedDuration: m.duration.fast,
			spring: collapse,
			skip: !mounted.current
		}}
		out:heightPresence={{
			reduced,
			reducedDuration: m.duration.fast,
			spring: collapse,
			fade: { duration: m.duration.exit, easing: m.ease.standard }
		}}
		onpointerenter={(event) => {
			if (event.pointerType === 'mouse') hovered = true;
		}}
		onpointerleave={() => (hovered = false)}
		onfocusin={() => (focused = true)}
		onfocusout={(event) => {
			if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focused = false;
		}}
	>
		<div class="arc-announcement-bar__bar" data-tone={tone} style:--controls={controlCount}>
			<div class="arc-announcement-bar__side" aria-hidden="true"></div>
			<div
				class="arc-announcement-bar__viewport"
				style:height={`${height.current}px`}
				id={`${uid}-slides`}
				aria-live={running ? 'off' : 'polite'}
				aria-atomic="false"
			>
				<Slides
					exitingBar={() => !shown || !announcement}
					{announcement}
					{direction}
					{reduced}
					position={current + 1}
					{total}
					{onSize}
					{onAction}
					{onCountdownEnd}
				/>
			</div>
			<div class="arc-announcement-bar__controls">
				{#if navigable}<button
						type="button"
						class="arc-announcement-bar__icon"
						aria-label="Previous announcement"
						aria-controls={`${uid}-slides`}
						onclick={() => go(-1)}
						><ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" /></button
					>{#if rotating}<button
							type="button"
							class="arc-announcement-bar__ring"
							aria-label={userPaused ? 'Resume announcements' : 'Pause announcements'}
							aria-pressed={userPaused}
							onclick={() => (userPaused = !userPaused)}
							><svg viewBox="0 0 20 20" aria-hidden="true"
								><circle cx="10" cy="10" r="8" class="arc-announcement-bar__ring-track" /><circle
									cx="10"
									cy="10"
									r="8"
									class="arc-announcement-bar__ring-fill"
									stroke-dasharray={RING}
									style:stroke-dashoffset={RING * (1 - progress)}
								/></svg
							><span class="arc-announcement-bar__ring-icon"
								>{#if userPaused}<Play size={9} strokeWidth={2.4} aria-hidden="true" />{:else}<Pause
										size={9}
										strokeWidth={2.4}
										aria-hidden="true"
									/>{/if}</span
							></button
						>{/if}<button
						type="button"
						class="arc-announcement-bar__icon"
						aria-label="Next announcement"
						aria-controls={`${uid}-slides`}
						onclick={() => go(1)}
						><ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" /></button
					>{/if}{#if dismissible}<button
						type="button"
						class="arc-announcement-bar__icon"
						aria-label="Dismiss"
						onclick={dismiss}><X size={16} strokeWidth={1.75} aria-hidden="true" /></button
					>{/if}
			</div>
		</div>
	</section>{/if}
