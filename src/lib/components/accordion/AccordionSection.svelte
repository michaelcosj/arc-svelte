<script lang="ts">
	import { Accordion as Primitive } from 'bits-ui';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { untrack } from 'svelte';
	import { prefersReducedMotion, Spring, Tween } from 'svelte/motion';
	import { motionTokens as m, springCurve } from '#lib/motion';
	import type { AccordionItem } from './types';

	let { item, value, open }: { item: AccordionItem; value: string; open: boolean } = $props();

	const uid = $props.id();
	const triggerId = `${uid}-trigger`;
	const contentId = `${uid}-content`;
	const reduced = $derived(prefersReducedMotion.current);

	let panel = $state<HTMLElement | null>(null);
	let inner = $state<HTMLElement>();

	// The state the panel rests in: `height: auto` when open, 0 when closed. While `moving`, the
	// height spring owns it instead, so a toggle mid-flight retargets with its velocity intact.
	const initial = untrack(() => open);
	let rest = $state(initial);
	let moving = $state(false);
	let run = 0;

	/** Height follows the content on a spring that never overshoots. */
	const height = new Spring(0, { ...m.physics.smooth, precision: 0.5 });
	const opacity = new Tween(initial ? 1 : 0);
	/** The answer settles down into place with a brief focus pull as the panel opens. */
	const y = new Tween(initial ? 0 : -6);
	const blur = new Tween(initial ? 0 : m.blur.subtle);
	const rotate = new Spring(initial ? 180 : 0, m.physics.snappy);

	const settle = springCurve(m.specs.smooth, 6);
	const enter = { duration: m.duration.standard, easing: m.ease.enter };
	const leave = { duration: m.duration.fast, easing: m.ease.standard };

	let shown = initial;
	$effect(() => {
		const next = open;
		if (next === shown) return;
		shown = next;
		untrack(() => toggle(next));
	});

	function toggle(next: boolean) {
		const instant = reduced;
		const still = { duration: 0 };
		void rotate.set(next ? 180 : 0, { instant });
		void opacity.set(next ? 1 : 0, instant ? still : next ? enter : leave);
		void y.set(next ? 0 : -6, instant ? still : next ? settle : leave);
		void blur.set(next ? 0 : m.blur.subtle, instant ? still : next ? enter : leave);

		const from = moving ? height.current : rest ? (panel?.offsetHeight ?? 0) : 0;
		const target = next ? (inner?.offsetHeight ?? 0) : 0;
		const id = ++run;
		if (!moving) void height.set(from, { instant: true });
		moving = !instant;
		void height.set(target, { instant }).then(() => {
			if (id !== run) return;
			moving = false;
			rest = next;
		});
		if (instant) rest = next;
	}

	// Closed panels leave the accessibility tree once they finish collapsing.
	const visible = $derived(rest || moving);
	const panelHeight = $derived(moving ? `${height.current}px` : rest ? 'auto' : '0px');
	const filter = $derived(blur.current <= 0 ? 'none' : `blur(${blur.current}px)`);
</script>

<Primitive.Item {value} class="arc-accordion__item">
	<Primitive.Header level={3}>
		{#snippet child({ props })}
			<h3 {...props} class="arc-accordion__header" role={undefined} aria-level={undefined}>
				<Primitive.Trigger id={triggerId}>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="arc-accordion__trigger"
							aria-controls={open ? contentId : undefined}
							aria-disabled={undefined}
						>
							<span>{item.title}</span>
							<span class="arc-accordion__icon" style:transform="rotate({rotate.current}deg)">
								<ChevronDown width={17} height={17} aria-hidden="true" />
							</span>
						</button>
					{/snippet}
				</Primitive.Trigger>
			</h3>
		{/snippet}
	</Primitive.Header>
	<!-- Bits keeps semantics and ids; the springs own the height so a toggle mid-flight retargets instead of restarting. -->
	<Primitive.Content id={contentId} forceMount bind:ref={panel}>
		{#snippet child({ props })}
			<div
				{...props}
				class="arc-accordion__panel"
				role="region"
				aria-labelledby={triggerId}
				style:height={panelHeight}
				style:opacity={opacity.current}
				style:visibility={visible ? 'visible' : 'hidden'}
			>
				<div
					bind:this={inner}
					class="arc-accordion__panel-inner"
					style:transform={y.current ? `translateY(${y.current}px)` : undefined}
					style:filter
				>
					{#if typeof item.content === 'string'}{item.content}{:else}{@render item.content()}{/if}
				</div>
			</div>
		{/snippet}
	</Primitive.Content>
</Primitive.Item>
