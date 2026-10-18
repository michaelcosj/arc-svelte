<script lang="ts">
	import { Dialog as Primitive } from 'bits-ui';
	import X from '@lucide/svelte/icons/x';
	import { prefersReducedMotion } from 'svelte/motion';
	import { easeOut, motionTokens as m, layer, type SwapParams } from '#lib/motion';
	import DialogText from './DialogText.svelte';
	import type { DialogContentProps } from './types';
	import './dialog.css';

	let {
		title,
		description,
		children,
		class: className,
		ref = $bindable(null),
		...props
	}: DialogContentProps = $props();

	const reduced = $derived(prefersReducedMotion.current);

	// Reduced motion only fades. motion runs a duration-only opacity tween on WAAPI, whose default is CSS `ease-out`.
	const fade: SwapParams = { duration: m.duration.instant, easing: easeOut };
	const leave = { duration: m.duration.fast, easing: m.ease.standard };

	// The overlay fades while the dialog rises 8px and scales up on a spring. Closing is shorter and quieter.
	const overlayIn = $derived<SwapParams>(
		reduced ? fade : { duration: m.duration.standard, easing: m.ease.enter }
	);
	const overlayOut = $derived<SwapParams>(reduced ? fade : leave);
	const contentIn = $derived<SwapParams>(
		reduced
			? fade
			: {
					y: 8,
					scale: 0.96,
					...m.spring.smooth,
					fade: { duration: m.duration.fast, easing: m.ease.enter }
				}
	);
	const contentOut = $derived<SwapParams>(reduced ? fade : { y: 4, scale: 0.98, ...leave });
</script>

<Primitive.Portal>
	<Primitive.Overlay forceMount>
		{#snippet child({ props: overlayProps, open })}
			{#if open}
				<div
					{...overlayProps}
					class="arc-dialog__overlay"
					in:layer={overlayIn}
					out:layer={overlayOut}
				></div>
			{/if}
		{/snippet}
	</Primitive.Overlay>
	<Primitive.Content {...props} bind:ref forceMount>
		{#snippet child({ props: contentProps, open })}
			{#if open}
				<div
					{...contentProps}
					class={['arc-dialog__content', className]}
					in:layer={contentIn}
					out:layer={contentOut}
				>
					<div class="arc-dialog__header">
						<div>
							<Primitive.Title>
								{#snippet child({ props: titleProps })}
									<!-- Bits gives a div the heading role; this is a real h2, like Radix renders. -->
									{@const { role: _role, 'aria-level': _level, ...heading } = titleProps}
									<h2 {...heading} class="arc-dialog__title"><DialogText text={title} /></h2>
								{/snippet}
							</Primitive.Title>
							{#if description}
								<Primitive.Description>
									{#snippet child({ props: descriptionProps })}
										<p {...descriptionProps} class="arc-dialog__description">
											<DialogText text={description} />
										</p>
									{/snippet}
								</Primitive.Description>
							{/if}
						</div>
						<Primitive.Close class="arc-dialog__close" aria-label="Close dialog">
							<X size={16} strokeWidth={1.75} aria-hidden="true" />
						</Primitive.Close>
					</div>
					<div class="arc-dialog__body">{@render children()}</div>
				</div>
			{/if}
		{/snippet}
	</Primitive.Content>
</Primitive.Portal>
