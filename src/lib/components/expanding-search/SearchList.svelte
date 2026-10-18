<script lang="ts">
	import { untrack } from 'svelte';
	import { Command } from 'bits-ui';
	import { Tween } from 'svelte/motion';
	import {
		Mounted,
		motionTokens as m,
		PhysicalSpring,
		PopLayout,
		positionFlip,
		swap
	} from '#lib/motion';
	import SearchMatch from './SearchMatch.svelte';
	import type { ExpandingSearchItem, SearchGroup } from './types';
	let {
		id,
		label,
		groups,
		query,
		activeIndex,
		optionId,
		reduced,
		keyboard,
		onHover,
		onChoose
	}: {
		id: string;
		label: string;
		groups: SearchGroup[];
		query: string;
		activeIndex: number;
		optionId: (item: ExpandingSearchItem) => string;
		reduced: boolean;
		keyboard: () => boolean;
		onHover: (index: number) => void;
		onChoose: (item: ExpandingSearchItem) => void;
	} = $props();
	let list = $state<HTMLDivElement | null>(null);
	const flat = $derived(groups.flatMap((group) => group.items));
	const layoutKey = $derived(flat.map((item) => item.id).join('|'));
	const activeId = $derived(flat[activeIndex] ? optionId(flat[activeIndex]!) : '');
	const travel = new PhysicalSpring(0, m.specs.snappy),
		fade = new Tween(1);
	let last: { id: string; set: string; top: number } | null = null;
	const mounted = new Mounted(),
		layout = new PopLayout();
	$effect.pre(() => {
		void layoutKey;
		untrack(() => layout.capture(list));
	});
	$effect(() => {
		const id = activeId,
			set = layoutKey,
			snap = reduced;
		untrack(() => {
			const row = id ? document.getElementById(id) : null;
			if (!list || !row) {
				last = null;
				return;
			}
			let top = 0;
			for (
				let node: HTMLElement | null = row;
				node && node !== list;
				node = node.offsetParent as HTMLElement | null
			)
				top += node.offsetTop;
			const previous = last;
			last = { id, set, top };
			if (previous?.id === id) return;
			if (previous && previous.set === set && !snap) {
				const velocity = travel.velocity;
				travel.jump(previous.top + travel.current - top);
				travel.set(0, { velocity });
			} else {
				travel.jump(0);
				void fade.set(snap ? 1 : 0, { duration: 0 });
				if (!snap) void fade.set(1, { duration: m.duration.instant, easing: m.ease.enter });
			}
			if (keyboard()) row.scrollIntoView({ block: 'nearest' });
		});
	});
	function cleanup() {
		return () => {
			travel.destroy();
			void fade.set(fade.current, { duration: 0 });
		};
	}
</script>

<Command.List {id} aria-label={label} bind:ref={list}>
	{#snippet child({ props })}
		<div {...props} class="arc-expanding-search__listbox" {@attach cleanup}>
			{#each groups as group (group.name)}
				{@const headingId = `${id}-${group.name || 'results'}`.replace(/\s+/g, '-')}
				<div
					role="group"
					aria-labelledby={group.name ? headingId : undefined}
					class="arc-expanding-search__group"
					data-pop-key={`group-${group.name}`}
					animate:positionFlip={reduced
						? { duration: 0, easing: m.ease.standard }
						: m.spring.smooth}
					in:swap={{ duration: m.duration.fast, easing: m.ease.enter, skip: !mounted.current }}
					out:swap={{ duration: 80, pop: layout.box(`group-${group.name}`) }}
				>
					{#if group.name}<div
							id={headingId}
							class="arc-expanding-search__group-label"
							role="presentation"
						>
							{group.name}
						</div>{/if}
					{#each group.items as item (item.id)}
						<div
							data-pop-key={item.id}
							animate:positionFlip={reduced
								? { duration: 0, easing: m.ease.standard }
								: m.spring.smooth}
							in:swap={{ duration: m.duration.fast, easing: m.ease.enter, skip: !mounted.current }}
							out:swap={{ duration: 80, pop: layout.box(item.id) }}
						>
							<Command.Item id={optionId(item)} value={item.id} onSelect={() => onChoose(item)}>
								{#snippet child({ props: itemProps })}
									<div
										{...itemProps}
										role="option"
										aria-selected={flat.indexOf(item) === activeIndex}
										data-active={flat.indexOf(item) === activeIndex || undefined}
										class="arc-expanding-search__option"
										onpointermove={() => {
											if (flat.indexOf(item) !== activeIndex) onHover(flat.indexOf(item));
										}}
										onmousedown={(event) => event.preventDefault()}
									>
										{#if flat.indexOf(item) === activeIndex}<span
												class="arc-expanding-search__highlight"
												style:transform={`translateY(${travel.current}px)`}
												style:opacity={fade.current}
												aria-hidden="true"
											></span>{/if}
										{#if item.icon}<span
												class="arc-expanding-search__option-icon"
												aria-hidden="true">{@render item.icon()}</span
											>{/if}
										<span class="arc-expanding-search__option-text"
											><span class="arc-expanding-search__option-title"
												><SearchMatch text={item.title} {query} /></span
											>{#if item.meta}<span class="arc-expanding-search__option-meta"
													>{item.meta}</span
												>{/if}</span
										>
									</div>
								{/snippet}
							</Command.Item>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/snippet}
</Command.List>
