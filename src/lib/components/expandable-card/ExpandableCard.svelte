<script lang="ts">
	import { untrack } from 'svelte';
	import { Spring, Tween, prefersReducedMotion } from 'svelte/motion';
	import type { Attachment } from 'svelte/attachments';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { motionTokens as m, springOptions, Mounted, swap } from '#lib/motion';
	import type { ExpandableCardProps } from './types';
	import './expandable-card.css';
	let {
		title,
		description,
		children,
		defaultExpanded = false,
		width,
		expandedWidth,
		class: className,
		style,
		onkeydown,
		...props
	}: ExpandableCardProps = $props();
	const id = $props.id();
	let expanded = $state(untrack(() => defaultExpanded));
	let room = $state<number>();
	let detailHeight = $state(0);
	let hold = $state(true);
	let lastToggle = 0;
	let placed = $state(false);
	let trigger: HTMLButtonElement;
	const mounted = new Mounted();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const cap = $derived(expandedWidth ?? width);
	const innerWidth = $derived(room === undefined ? undefined : Math.min(room, cap ?? room) - 2);
	const targetWidth = $derived(
		room === undefined ? undefined : Math.min(room, (expanded ? cap : width) ?? room)
	);
	const boxWidth = new Spring(0, springOptions(m.specs.smooth, 0.5));
	const panelHeight = new Spring(0, springOptions(m.specs.smooth, 0.5));
	const rotation = new Spring(
		untrack(() => (defaultExpanded ? 180 : 0)),
		springOptions(m.specs.smooth, 0.1)
	);
	const opacity = new Tween(untrack(() => (defaultExpanded ? 1 : 0)));
	const measureRoom: Attachment<HTMLDivElement> = (node) => {
		const read = () => (room = node.clientWidth);
		read();
		const observer = new ResizeObserver(read);
		observer.observe(node);
		return () => observer.disconnect();
	};
	const measureDetails: Attachment<HTMLDivElement> = (node) => {
		const read = () => (detailHeight = node.getBoundingClientRect().height);
		read();
		const observer = new ResizeObserver(read);
		observer.observe(node);
		return () => observer.disconnect();
	};
	$effect(() => {
		const target = targetWidth;
		const height = expanded ? detailHeight : 0;
		const angle = expanded ? 180 : 0;
		const instant = reduced;
		const delay = !expanded && hold && !instant ? 60 : 0;
		return untrack(() => {
			if (target === undefined) return;
			const first = !placed;
			placed = true;
			const set = () => {
				void boxWidth.set(target, { instant: instant || first });
				void panelHeight.set(height, { instant: instant || first });
				void rotation.set(angle, { instant: instant || first });
			};
			if (delay && !first) {
				const timer = setTimeout(set, delay);
				return () => clearTimeout(timer);
			}
			set();
		});
	});
	$effect(() => {
		const open = expanded;
		const instant = reduced;
		untrack(
			() =>
				void opacity.set(open ? 1 : 0, {
					duration: instant ? 0 : open ? m.duration.standard : 100,
					delay: instant || !open ? 0 : 120,
					easing: m.ease.standard
				})
		);
	});
	function toggle(next: boolean) {
		const now = performance.now();
		hold = now - lastToggle > 450;
		lastToggle = now;
		expanded = next;
	}
	function keydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLElement }) {
		onkeydown?.(event);
		if (!event.defaultPrevented && event.key === 'Escape' && expanded) {
			event.preventDefault();
			toggle(false);
			trigger?.focus();
		}
	}
	const words = $derived(description?.split(/(\s+)/) ?? []);
</script>

<div class="arc-expandable-card__track" {@attach measureRoom}>
	<article
		{...props}
		class={['arc-expandable-card', className]}
		data-expanded={expanded}
		data-measured={placed ? '' : undefined}
		style={`${style ?? ''};--expandable-card-width:${width ? `${width}px` : '100%'};--expandable-card-expanded-width:${cap ? `${cap}px` : '100%'};${placed ? `width:${boxWidth.current}px` : ''}`}
		onkeydown={keydown}
	>
		<button
			bind:this={trigger}
			type="button"
			class="arc-expandable-card__trigger"
			aria-expanded={expanded}
			aria-controls={id}
			onclick={() => toggle(!expanded)}
		>
			<span class="arc-expandable-card__copy"
				><strong>{title}</strong>{#if description}<span class="arc-expandable-card__description"
						><span class="arc-expandable-card__roll"
							><span class="arc-expandable-card__sr-only">{description}</span><span
								aria-hidden="true"
								>{#each words as word, index (`${index}:${word}`)}<span
										class="arc-expandable-card__word"
										in:swap={{
											y: '.35em',
											blur: m.blur.soft,
											duration: m.duration.standard,
											easing: m.ease.enter,
											skip: !mounted.current || reduced
										}}
										out:swap={{
											y: '-.3em',
											blur: m.blur.subtle,
											duration: reduced ? 0 : m.duration.fast,
											easing: m.ease.standard,
											pop: true
										}}>{word}</span
									>{/each}</span
							></span
						></span
					>{/if}</span
			>
			<span class="arc-expandable-card__arrow" style:transform={`rotate(${rotation.current}deg)`}
				><ChevronDown width={18} height={18} aria-hidden="true" /></span
			>
		</button>
		<div
			{id}
			class="arc-expandable-card__panel"
			inert={!expanded}
			style:height={placed && Math.abs(panelHeight.current - (expanded ? detailHeight : 0)) > 0.5
				? `${panelHeight.current}px`
				: expanded
					? 'auto'
					: '0px'}
		>
			<div
				class="arc-expandable-card__panel-inner"
				style:width={innerWidth === undefined ? undefined : `${innerWidth}px`}
				style:opacity={opacity.current}
				{@attach measureDetails}
			>
				{@render children()}
			</div>
		</div>
	</article>
</div>
