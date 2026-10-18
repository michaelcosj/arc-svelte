<script lang="ts">
	import { Dialog as Primitive } from 'bits-ui';
	import X from '@lucide/svelte/icons/x';
	import { onDestroy, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { cssEasing, easeOut, motionTokens as m, swap } from '#lib/motion';
	import CardStatus from './CardStatus.svelte';
	import { captureCard, CardMorph, zoomCard } from './card-morph';
	import type { CardProps } from './types';
	import './card.css';

	let {
		title,
		description,
		media,
		action,
		avatar,
		meta,
		status,
		details,
		defaultOpen = false,
		open = $bindable(defaultOpen),
		onOpenChange,
		children,
		class: className,
		ref = $bindable(null),
		...props
	}: CardProps = $props();
	const reduced = $derived(prefersReducedMotion.current);
	const shown = $derived(Boolean(details) && open);
	let landing = $state<DOMRect | null>(null);
	const returning = $derived(!shown && landing !== null);
	let panel = $state<HTMLElement | null>(null);
	let measure = $state<number>();
	let hovered = $state(false);
	let photo: HTMLElement | undefined;
	let photoAnimation: Animation | undefined;
	let lift: Animation | undefined;
	let returnTimer: ReturnType<typeof setTimeout> | undefined;
	let before: ReturnType<typeof captureCard> | undefined;
	let previous = false;
	const morph = new CardMorph();

	function changeOpen(next: boolean) {
		open = next;
		onOpenChange?.(next);
	}

	$effect.pre(() => {
		const next = shown;
		const noMotion = reduced;
		const hasDetails = Boolean(details);
		untrack(() => {
			if (!hasDetails) {
				clearTimeout(returnTimer);
				morph.cancel();
				landing = null;
				before = undefined;
				previous = false;
				return;
			}
			if (next === previous) return;
			previous = next;
			clearTimeout(returnTimer);
			before = panel ? captureCard(panel) : ref ? captureCard(ref) : undefined;
			if (next) landing = null;
			else if (!noMotion && ref) landing = ref.getBoundingClientRect();
		});
	});

	$effect(() => {
		const next = shown;
		const node = panel;
		const noMotion = reduced;
		if (!node) return;
		untrack(() => {
			if (noMotion) {
				morph.cancel();
				landing = null;
				return;
			}
			if (before) morph.move(node, before, !next);
			before = undefined;
			if (!next) {
				returnTimer = setTimeout(() => {
					if (ref && panel) {
						const remaining = captureCard(panel);
						morph.move(ref, remaining, true);
					}
					landing = null;
				}, 300);
			}
		});
	});

	onDestroy(() => {
		clearTimeout(returnTimer);
		morph.cancel();
		photoAnimation?.cancel();
		lift?.cancel();
	});

	function track(node: HTMLElement) {
		ref = node;
		const observer = new ResizeObserver(() => {
			const content = node.querySelector<HTMLElement>('.arc-card__content');
			if (content) {
				const padding = parseFloat(getComputedStyle(content).paddingLeft);
				measure = content.clientWidth - padding * 2;
			}
		});
		observer.observe(node);
		return () => observer.disconnect();
	}

	function hover(next: boolean, event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		hovered = next;
		if (ref && !reduced) {
			const from = getComputedStyle(ref).transform;
			lift?.cancel();
			lift = ref.animate([{ transform: from }, { transform: `translateY(${next ? -2 : 0}px)` }], {
				duration: m.spring.snappy.duration,
				easing: cssEasing(m.spring.snappy.easing),
				fill: 'forwards'
			});
		}
		if (photo) {
			const nextAnimation = zoomCard(photo, next, reduced);
			photoAnimation?.cancel();
			photoAnimation = nextAnimation;
		}
	}
</script>

{#snippet footer()}
	{#if avatar || meta || status || action}
		<div class="arc-card__footer">
			{#if avatar || meta || status}
				<div class="arc-card__byline">
					{#if avatar}<span class="arc-card__avatar">{@render avatar()}</span>{/if}
					<span class="arc-card__byline-text">
						{#if meta}<span class="arc-card__meta"
								>{#if typeof meta === 'string'}{meta}{:else}{@render meta()}{/if}</span
							>{/if}
						{#if status}<CardStatus text={status} />{/if}
					</span>
				</div>
			{/if}
			{#if action}<div class="arc-card__action">{@render action()}</div>{/if}
		</div>
	{/if}
{/snippet}

{#snippet card()}
	<article
		{...props}
		class={['arc-card', className]}
		data-hover={hovered || undefined}
		data-covered={(!reduced && (shown || returning)) || undefined}
		{@attach track}
		onpointerenter={(event) => {
			props.onpointerenter?.(event);
			hover(true, event);
		}}
		onpointerleave={(event) => {
			props.onpointerleave?.(event);
			hover(false, event);
		}}
	>
		{#if media}<div class="arc-card__media">
				<div
					class="arc-card__zoom"
					{@attach (node) => {
						photo = node;
						return () => {
							photo = undefined;
						};
					}}
				>
					{@render media()}
				</div>
			</div>{/if}
		<div class="arc-card__content">
			<h3 class="arc-card__title">
				{#if details}<Primitive.Trigger class="arc-card__trigger" type="button"
						>{title}</Primitive.Trigger
					>{:else}{title}{/if}
			</h3>
			{#if description}<p class="arc-card__description">{description}</p>{/if}
			{@render children?.()}
			{@render footer()}
		</div>
	</article>
{/snippet}

{#if details}
	<Primitive.Root open={shown} onOpenChange={changeOpen}>
		{@render card()}
		<Primitive.Portal>
			<Primitive.Overlay forceMount>
				{#snippet child({ props: overlayProps })}
					{#if shown}<div
							{...overlayProps}
							class="arc-card__overlay"
							in:swap={{
								duration: reduced ? m.duration.instant : m.duration.standard,
								easing: reduced ? easeOut : m.ease.enter
							}}
							out:swap={{
								duration: reduced ? m.duration.instant : m.duration.exit,
								easing: reduced ? easeOut : m.ease.standard
							}}
						></div>{/if}
				{/snippet}
			</Primitive.Overlay>
			<Primitive.Content forceMount>
				{#snippet child({ props: panelProps })}
					{#if shown || returning}
						<div
							{...panelProps}
							bind:this={panel}
							class="arc-card__panel"
							data-returning={returning || undefined}
							inert={returning}
							aria-hidden={returning || undefined}
							aria-describedby={description && typeof panelProps['aria-describedby'] === 'string'
								? panelProps['aria-describedby']
								: undefined}
							style:--card-measure={!reduced && measure ? `${measure}px` : undefined}
							style:--landing-top={landing ? `${landing.top}px` : undefined}
							style:--landing-left={landing ? `${landing.left}px` : undefined}
							style:--landing-width={landing ? `${landing.width}px` : undefined}
							style:--landing-height={landing ? `${landing.height}px` : undefined}
							in:swap={{ duration: reduced ? m.duration.instant : 0, easing: easeOut }}
							out:swap={{ duration: reduced ? m.duration.instant : 0, easing: easeOut }}
						>
							{#if media}<div class="arc-card__media">
									<div class="arc-card__zoom">{@render media()}</div>
								</div>{/if}
							<span
								class="arc-card__close-slot"
								data-returning={returning || undefined}
								in:swap={{
									scale: reduced ? 1 : 0.9,
									delay: reduced ? 0 : m.duration.instant,
									duration: m.duration.fast,
									easing: m.ease.enter
								}}
								><Primitive.Close
									type="button"
									class="arc-card__close"
									aria-label="Close quick look"
									><X size={16} strokeWidth={1.75} aria-hidden="true" /></Primitive.Close
								></span
							>
							<div class="arc-card__content">
								<Primitive.Title>
									{#snippet child({ props: titleProps })}{@const {
											role: _role,
											'aria-level': _level,
											...heading
										} = titleProps}
										<h2 {...heading} class="arc-card__title">{title}</h2>{/snippet}
								</Primitive.Title>
								{#if description}<Primitive.Description
										>{#snippet child({ props: descriptionProps })}<p
												{...descriptionProps}
												class="arc-card__description"
											>
												{description}
											</p>{/snippet}</Primitive.Description
									>{/if}
								{@render children?.()}
								{@render footer()}
								<div
									class="arc-card__details"
									data-returning={returning || undefined}
									in:swap={{
										y: reduced ? 0 : 6,
										delay: reduced ? 0 : m.duration.instant,
										duration: m.duration.standard,
										easing: m.ease.enter
									}}
								>
									{@render details()}
								</div>
							</div>
						</div>
					{/if}
				{/snippet}
			</Primitive.Content>
		</Primitive.Portal>
	</Primitive.Root>
{:else}
	{@render card()}
{/if}
