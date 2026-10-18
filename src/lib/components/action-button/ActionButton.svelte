<script lang="ts">
	import { onDestroy } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { Attachment } from 'svelte/attachments';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Mounted, swap, motionTokens as m, springCurve } from '#lib/motion';
	import type { ActionButtonProps } from './types';
	import MorphText from './MorphText.svelte';
	import './action-button.css';
	let {
		label,
		successLabel = 'Saved',
		pendingLabel = 'Saving',
		onAction,
		resetAfterMs = 2400,
		onActionError,
		class: className,
		disabled,
		ref = $bindable(null),
		...props
	}: ActionButtonProps = $props();
	let state = $state<'idle' | 'pending' | 'success'>('idle');
	let timer: ReturnType<typeof setTimeout> | undefined;
	const reduced = $derived(Boolean(prefersReducedMotion.current)),
		mounted = new Mounted();
	const text = $derived(
			state === 'pending' ? pendingLabel : state === 'success' ? successLabel : label
		),
		pending = $derived(state === 'pending');
	onDestroy(() => clearTimeout(timer));
	async function run() {
		if (state === 'pending') return;
		clearTimeout(timer);
		state = 'pending';
		try {
			await onAction();
			state = 'success';
			if (resetAfterMs > 0) timer = setTimeout(() => (state = 'idle'), resetAfterMs);
		} catch (error) {
			state = 'idle';
			onActionError?.(error);
		}
	}
	const measure: Attachment<HTMLButtonElement> = (node) => {
		const update = () =>
			node.style.setProperty('--arc-action-button-press', node.offsetWidth > 220 ? '.985' : '.97');
		update();
		const observer = new ResizeObserver(update);
		observer.observe(node);
		return () => observer.disconnect();
	};
</script>

<button
	{...props}
	bind:this={ref}
	{@attach measure}
	tabindex={props.tabindex ?? 0}
	type={props.type ?? 'button'}
	class={['arc-action-button', className]}
	{disabled}
	aria-disabled={pending ? true : props['aria-disabled']}
	aria-busy={pending}
	data-state={state}
	onclick={run}
	><span class="arc-action-button__content" aria-hidden="true"
		><MorphText {text} {reduced} /><span class="arc-action-button__icon-slot"
			>{#each [state] as phase (phase)}<span
					class="arc-action-button__phase"
					in:swap={{
						x: !reduced && phase === 'idle' ? -6 : undefined,
						scale: !reduced && phase !== 'idle' ? 0.6 : undefined,
						blur: reduced ? 0 : m.blur.subtle,
						...springCurve(m.specs.snappy, phase === 'idle' ? 6 : 0.4),
						duration: reduced
							? m.duration.instant
							: springCurve(m.specs.snappy, phase === 'idle' ? 6 : 0.4).duration,
						fade: reduced ? undefined : { duration: m.duration.fast, easing: m.ease.enter },
						skip: !mounted.current
					}}
					out:swap={{
						x: !reduced && phase === 'idle' ? 8 : undefined,
						scale: !reduced && phase !== 'idle' ? 0.6 : undefined,
						blur: reduced ? 0 : m.blur.subtle,
						duration: reduced ? m.duration.instant : m.duration.fast,
						easing: reduced ? undefined : m.ease.standard
					}}
					>{#if phase === 'pending'}<span class="arc-action-button__spinner"
						></span>{:else if phase === 'success'}<svg
							class="arc-action-button__status-icon"
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path class="arc-action-button__check" d="M4 12l5 5L20 6" pathLength="1" /></svg
						>{:else}<ArrowRight
							class="arc-action-button__arrow"
							width={17}
							height={17}
						/>{/if}</span
				>{/each}</span
		></span
	><span class="arc-action-button__visually-hidden">{label}</span><span
		class="arc-action-button__visually-hidden"
		role="status">{pending ? pendingLabel : state === 'success' ? successLabel : ''}</span
	></button
>
