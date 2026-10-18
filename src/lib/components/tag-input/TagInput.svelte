<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import X from '@lucide/svelte/icons/x';
	import {
		cssEasing,
		easeOut,
		FieldMessage,
		HeightMorph,
		Highlight,
		Mounted,
		motionTokens as m,
		PopLayout,
		springCurve,
		swap
	} from '#lib/motion';
	import type { TagInputProps } from './types';
	import './tag-input.css';

	let {
		label,
		defaultValue = [],
		value: valueProp = $bindable(),
		onValueChange,
		placeholder = 'Add a tag',
		description,
		id
	}: TagInputProps = $props();
	const generatedId = $props.id();
	const inputId = $derived(id ?? generatedId);
	const hintId = $derived(description ? `${inputId}-description` : undefined);
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	let internal = $state<string[]>(untrack(() => defaultValue));
	const value = $derived(valueProp ?? internal);
	let draft = $state('');
	let picked = $state<string | null>(null);
	let notice = $state('');
	let content = $state<HTMLDivElement>();
	let input = $state<HTMLInputElement>();
	let ring = $state<HTMLSpanElement>();
	const active = $derived(picked !== null && value.includes(picked) ? picked : null);
	const layout = new PopLayout();
	const height = new HeightMorph(() => ({ reduced, follow: true, measure: 'offset' }));
	const selection = new Highlight(() => ({ reduced, measure: 'offset' }));
	let ringAt = '';
	let ringAnimation: Animation | undefined;
	let ringFade: Animation | undefined;
	let inputBefore: DOMRect | undefined;
	let inputAnimation: Animation | undefined;

	$effect.pre(() => {
		void value;
		untrack(() => {
			layout.capture(content);
			inputBefore = input?.getBoundingClientRect();
		});
	});

	$effect(() => {
		void value;
		untrack(() => {
			if (!input || !inputBefore) return;
			inputAnimation?.cancel();
			const after = input.getBoundingClientRect();
			const x = inputBefore.left - after.left;
			const y = inputBefore.top - after.top;
			if (!reduced && (x || y)) {
				inputAnimation = input.animate(
					[{ transform: `translate(${x}px, ${y}px)` }, { transform: 'none' }],
					{ duration: m.spring.morph.duration, easing: cssEasing(m.spring.morph.easing) }
				);
			}
		});
	});

	$effect(() => {
		void active;
		void value;
		untrack(placeRing);
	});

	function placeRing() {
		if (!ring) return;
		const node =
			active === null
				? null
				: content?.querySelector<HTMLElement>(`[data-tag="${CSS.escape(active)}"]`);
		if (!node) {
			if (ringAt) animateRing(false, false);
			ringAt = '';
			return;
		}
		const at = [node.offsetLeft, node.offsetTop, node.offsetWidth, node.offsetHeight].join(' ');
		if (at === ringAt) return;
		const glide = Boolean(ringAt) || Number(getComputedStyle(ring).opacity) > 0.02;
		// Retain the last box during a fade, so a new pick can glide from it.
		selection.move(node, glide);
		animateRing(true, glide);
		ringAt = at;
	}

	function observeContent(node: HTMLDivElement) {
		const observer = new ResizeObserver(placeRing);
		observer.observe(node);
		return () => observer.disconnect();
	}

	function animateRing(shown: boolean, glide: boolean) {
		if (!ring) return;
		const style = getComputedStyle(ring);
		const fromOpacity = Number(style.opacity);
		const opacity = shown ? 1 : 0;
		const scale = reduced || shown ? 1 : 0.9;
		const fromScale = shown && !glide ? (reduced ? 1 : 0.9) : style.scale;
		ringAnimation?.cancel();
		ringFade?.cancel();
		ring.style.opacity = String(opacity);
		ring.style.scale = String(scale);
		const fadeDuration = reduced
			? shown
				? m.duration.instant
				: 0
			: shown
				? m.duration.fast
				: m.duration.instant;
		ringFade = ring.animate([{ opacity: shown && !glide ? 0 : fromOpacity }, { opacity }], {
			duration: fadeDuration,
			easing: cssEasing(shown ? easeOut : m.ease.standard)
		});
		const curve = shown
			? glide
				? m.spring.morph
				: m.spring.snappy
			: { duration: m.duration.instant, easing: m.ease.standard };
		ringAnimation = ring.animate([{ scale: fromScale }, { scale }], {
			duration: reduced ? 0 : curve.duration,
			easing: cssEasing(curve.easing)
		});
	}

	function cleanup() {
		return () => {
			inputAnimation?.cancel();
			ringAnimation?.cancel();
			ringFade?.cancel();
		};
	}

	function say(message: string) {
		notice = notice === message ? `${message}\u00a0` : message;
	}
	function update(next: string[]) {
		if (valueProp === undefined) internal = next;
		else if (!onValueChange) valueProp = next;
		onValueChange?.(next);
	}
	function pick(tag: string | null) {
		picked = tag;
		if (tag !== null) say(`${tag} selected. Press Backspace to remove it.`);
	}
	function add() {
		const tag = draft.trim();
		if (!tag) return;
		const existing = value.find((item) => item.toLowerCase() === tag.toLowerCase());
		if (existing) {
			const node = content?.querySelector<HTMLElement>(`[data-tag="${CSS.escape(existing)}"]`);
			if (node && !reduced)
				node.animate([{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], {
					duration: m.duration.standard + m.duration.instant,
					easing: cssEasing(m.ease.inOut)
				});
			say(`${existing} is already added`);
			return;
		}
		update([...value, tag]);
		draft = '';
		picked = null;
		say(`Added ${tag}`);
	}
	function remove(tag: string) {
		update(value.filter((item) => item !== tag));
		picked = null;
		say(`Removed ${tag}`);
		input?.focus();
	}
	function onKeyDown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		const { key, currentTarget } = event;
		const atStart = currentTarget.selectionStart === 0 && currentTarget.selectionEnd === 0;
		const index = active === null ? value.length : value.indexOf(active);
		let handled = true;
		if (key === 'Enter' || key === ',') add();
		else if ((key === 'Backspace' || key === 'Delete') && active !== null) remove(active);
		else if (key === 'Backspace' && atStart && value.length) pick(value[value.length - 1]!);
		else if (key === 'ArrowLeft' && (atStart || active !== null) && index > 0)
			pick(value[index - 1]!);
		else if (key === 'ArrowRight' && active !== null) pick(value[index + 1] ?? null);
		else if (key === 'Escape' && active !== null) pick(null);
		else handled = false;
		if (handled) event.preventDefault();
	}
	function tagIn(node: HTMLElement): TransitionConfig {
		if (!mounted.current) return { duration: 0 };
		if (reduced)
			return swap(
				node,
				{ duration: m.duration.instant, skip: !mounted.current },
				{ direction: 'in' }
			);
		const spring = springCurve(m.specs.morph, 0.1);
		const transition = swap(
			node,
			{
				scale: 0.9,
				...spring,
				skip: !mounted.current,
				fade: { duration: m.duration.fast, easing: m.ease.enter }
			},
			{ direction: 'in' }
		);
		const css = transition.css;
		return {
			...transition,
			css: (t, u) =>
				`${css?.(t, u) ?? ''}filter: blur(${m.blur.soft * (1 - m.ease.enter(Math.min(1, (t * (transition.duration ?? 0)) / m.duration.standard)))}px);`
		};
	}
</script>

<div class="arc-tag-input__field" {@attach cleanup}>
	<label for={inputId}>{label}</label>
	<div class="arc-tag-input__control" {@attach height.body}>
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="arc-tag-input__content"
			bind:this={content}
			{@attach height.content}
			{@attach observeContent}
			onclick={(event) => {
				if (event.target === event.currentTarget) input?.focus();
			}}
		>
			<span
				class="arc-tag-input__ring"
				bind:this={ring}
				aria-hidden="true"
				style:transform={`translate(${selection.box.x}px, ${selection.box.y}px)`}
				style:width={`${selection.box.width}px`}
				style:height={`${selection.box.height}px`}
			></span>
			{#each !draft && !value.length ? [{ key: 'placeholder', text: placeholder }] : [] as item (item.key)}
				<span
					class="arc-tag-input__placeholder"
					aria-hidden="true"
					in:swap={reduced
						? { duration: m.duration.instant, skip: !mounted.current }
						: {
								y: '0.3em',
								blur: m.blur.soft,
								duration: m.duration.standard,
								easing: m.ease.enter,
								skip: !mounted.current
							}}
					out:swap={{ duration: 0 }}>{item.text}</span
				>
			{/each}
			{#each value as tag (tag)}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<span
					class="arc-tag-input__tag"
					data-tag={tag}
					data-picked={tag === active || undefined}
					data-pop-key={tag}
					onmousedown={(event) => {
						if (!(event.target as HTMLElement).closest('button')) event.preventDefault();
					}}
					onclick={(event) => {
						if (!(event.target as HTMLElement).closest('button')) {
							pick(active === tag ? null : tag);
							input?.focus();
						}
					}}
					animate:flip={reduced ? { duration: 0 } : m.spring.morph}
					in:tagIn
					out:swap={reduced
						? { duration: 0, pop: layout.box(tag) }
						: {
								scale: 0.9,
								blur: m.blur.subtle,
								duration: m.duration.instant,
								easing: m.ease.standard,
								pop: layout.box(tag)
							}}
				>
					<span class="arc-tag-input__tag-label">{tag}</span><button
						type="button"
						onclick={() => remove(tag)}
						aria-label={`Remove ${tag}`}><X width={14} height={14} aria-hidden="true" /></button
					>
				</span>
			{/each}
			<input
				bind:this={input}
				id={inputId}
				value={draft}
				oninput={(event) => {
					draft = event.currentTarget.value;
					picked = null;
				}}
				onkeydown={onKeyDown}
				onblur={() => {
					add();
					picked = null;
				}}
				placeholder={value.length ? '' : placeholder}
				aria-describedby={hintId}
			/>
		</div>
	</div>
	<span class="arc-sr-only" aria-live="polite">{notice}</span>
	<FieldMessage
		id={hintId}
		text={description}
		class="arc-tag-input__hint"
		exit={{ duration: m.duration.instant, easing: m.ease.standard }}
	/>
</div>
