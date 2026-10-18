<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m } from '#lib/motion';
	import type { StepperProps, StepperStatus } from './types';
	import Marker from './StepperMarker.svelte';
	import Text from './StepperText.svelte';
	import Fill from './StepperFill.svelte';
	import './stepper.css';
	let {
		steps,
		current,
		orientation = 'horizontal',
		onStepSelect,
		details = 'all',
		compact = false,
		label = 'Progress',
		completeLabel = 'All steps complete',
		class: className
	}: StepperProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const count = $derived(steps.length);
	const active = $derived(Math.min(Math.max(Math.round(current), 0), count));
	let travel = $state(untrack(() => ({ to: active, from: active })));
	$effect.pre(() => {
		const next = active;
		untrack(() => {
			if (travel.to !== next) travel = { to: next, from: travel.to };
		});
	});
	const delayAt = (index: number) =>
		reduced
			? 0
			: active > travel.from
				? index >= travel.from && index < active
					? (index - travel.from) * m.stagger.line
					: 0
				: index >= active && index < travel.from
					? (travel.from - 1 - index) * m.stagger.line
					: 0;
	const ringDelay = $derived(
		reduced ? 0 : Math.max(0, Math.abs(active - travel.from) - 1) * m.stagger.line + 120
	);
	const vertical = $derived(orientation === 'vertical');
	const interactive = $derived(Boolean(onStepSelect));
	const now = $derived(active >= count ? undefined : steps[active]);
	const statusText: Record<StepperStatus, string> = {
		complete: 'Completed',
		current: '',
		upcoming: 'Not started',
		error: 'Error'
	};
	function keydown(event: KeyboardEvent & { currentTarget: HTMLOListElement }) {
		const rtl = !vertical && getComputedStyle(event.currentTarget).direction === 'rtl';
		const back = ['ArrowUp', rtl ? 'ArrowRight' : 'ArrowLeft'];
		const ahead = ['ArrowDown', rtl ? 'ArrowLeft' : 'ArrowRight'];
		if (![...back, ...ahead, 'Home', 'End'].includes(event.key)) return;
		const targets = Array.from(
			event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-reachable]')
		);
		const at = targets.indexOf(event.target as HTMLButtonElement);
		if (at < 0) return;
		event.preventDefault();
		const next =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? targets.length - 1
					: back.includes(event.key)
						? Math.max(0, at - 1)
						: Math.min(targets.length - 1, at + 1);
		targets[next]?.focus();
	}
</script>

<svelte:element
	this={interactive ? 'nav' : 'div'}
	class={[
		'arc-stepper',
		vertical ? 'arc-stepper--vertical' : 'arc-stepper--horizontal',
		compact && 'arc-stepper--compact',
		className
	]}
	aria-label={label}
	role={interactive ? undefined : 'group'}
>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -- Arrow shortcuts delegate only from the native step buttons, matching the source. -->
	<ol
		class="arc-stepper__list"
		style:grid-template-columns={vertical
			? undefined
			: count > 1
				? `repeat(${count - 1}, minmax(0, 1fr)) auto`
				: 'auto'}
		onkeydown={interactive ? keydown : undefined}
	>
		{#each steps as step, index (step.id)}
			{@const isCurrent = index === active}
			{@const status:StepperStatus=step.error?'error':index<active?'complete':isCurrent?'current':'upcoming'}
			{@const clickable = interactive && index < active}
			{@const detail =
				step.error ?? (details === 'all' || isCurrent ? step.description : undefined)}
			<li class="arc-stepper__item" data-status={status}>
				{#if index < count - 1}<span class="arc-stepper__connector" aria-hidden="true"
						>{#key orientation}<Fill
								complete={index < active}
								{vertical}
								delay={delayAt(index)}
								{reduced}
							/>{/key}</span
					>{/if}
				{#snippet content()}<Marker
						number={index + 1}
						kind={step.error ? 'error' : index < active ? 'check' : 'number'}
						current={isCurrent}
						glyphDelay={delayAt(index)}
						{ringDelay}
						{reduced}
					/><span class="arc-stepper__text"
						><span class="arc-stepper__label">{step.label}</span>{#if statusText[status]}<span
								class="arc-stepper__sr-only">, {statusText[status]}</span
							>{/if}<Text
							text={detail}
							class={step.error ? 'arc-stepper__error' : 'arc-stepper__description'}
							{reduced}
						/></span
					>{/snippet}
				{#if interactive}<button
						type="button"
						class="arc-stepper__head"
						data-clickable={clickable || undefined}
						data-reachable={index <= active || undefined}
						aria-current={isCurrent ? 'step' : undefined}
						aria-disabled={clickable ? undefined : true}
						tabindex={clickable ? undefined : -1}
						onclick={clickable ? () => onStepSelect?.(index) : undefined}
						>{@render content()}</button
					>{:else}<span class="arc-stepper__head" aria-current={isCurrent ? 'step' : undefined}
						>{@render content()}</span
					>{/if}
			</li>
		{/each}
	</ol>
	{#if !vertical}<span class="arc-stepper__caption" aria-hidden="true"
			><Text text={now?.label ?? completeLabel} class="arc-stepper__caption-label" {reduced} /><Text
				text={now?.error ?? now?.description}
				class={now?.error ? 'arc-stepper__error' : 'arc-stepper__description'}
				{reduced}
			/></span
		>{/if}
	<span class="arc-stepper__sr-only" aria-live="polite"
		>{now ? `Step ${active + 1} of ${count}: ${now.label}` : completeLabel}</span
	>
</svelte:element>
