<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		HeightMorph,
		Mounted,
		motionTokens as m,
		PopLayout,
		positionFlip,
		swap
	} from '#lib/motion';
	import ChipBody from './ChipBody.svelte';
	import MoreBody from './MoreBody.svelte';
	import type { ChipGroupProps } from './types';
	import './chip-group.css';

	let {
		options,
		value = $bindable([]),
		onValueChange,
		label,
		multiple = true,
		maxVisible = Infinity,
		class: className
	}: ChipGroupProps = $props();
	const MORE = '\u0000more';
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	let expanded = $state(false);
	let pinned = $state<string[]>(untrack(() => value));
	let active = $state<string | null>(null);
	let group = $state<HTMLDivElement>();
	const foldable = $derived(options.length > maxVisible);
	const visible = $derived(
		!foldable || expanded
			? options
			: options.filter(
					(option, index) =>
						index < maxVisible || pinned.includes(option.value) || value.includes(option.value)
				)
	);
	const hidden = $derived(options.length - visible.length);
	const showMore = $derived(foldable && (expanded || hidden > 0));
	const entries = $derived([
		...visible.map((option, index) => ({
			key: option.value,
			option,
			selected: value.includes(option.value),
			delay: expanded ? Math.min(Math.max(0, index - maxVisible) * m.stagger.item, 300) : 0
		})),
		...(showMore ? [{ key: MORE, option: null, selected: false, delay: 0 }] : [])
	]);
	const tabStop = $derived(
		active !== null && entries.some((entry) => entry.key === active)
			? active
			: (visible.find((option) => value.includes(option.value))?.value ?? entries[0]?.key)
	);
	const layout = new PopLayout();
	const height = new HeightMorph(() => ({ reduced, window: 160, pinBeforeChange: true }));
	$effect.pre(() => {
		void entries;
		void expanded;
		untrack(() => {
			height.changed();
			layout.capture(group);
		});
	});
	function toggle(next: string) {
		const on = value.includes(next);
		const values = !multiple
			? on
				? []
				: [next]
			: options
					.filter((option) => (option.value === next ? !on : value.includes(option.value)))
					.map((option) => option.value);
		if (onValueChange) onValueChange(values);
		else value = values;
	}
	function toggleMore() {
		if (expanded) pinned = value;
		expanded = !expanded;
	}
	function onKeyDown(event: KeyboardEvent) {
		const buttons = [
			...(group?.querySelectorAll<HTMLButtonElement>(
				":is(button[data-chip], button[data-more]):not([aria-hidden='true'])"
			) ?? [])
		];
		const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
		if (index < 0) return;
		const last = buttons.length - 1;
		const moves: Record<string, number> = {
			ArrowRight: index === last ? 0 : index + 1,
			ArrowDown: index === last ? 0 : index + 1,
			ArrowLeft: index === 0 ? last : index - 1,
			ArrowUp: index === 0 ? last : index - 1,
			Home: 0,
			End: last
		};
		if (!(event.key in moves)) return;
		event.preventDefault();
		buttons[moves[event.key]!]!.focus();
	}
</script>

<div class="arc-chip-group__frame" {@attach height.body}>
	<div class="arc-chip-group__content" {@attach height.content}>
		<div
			class={['arc-chip-group__group', className]}
			role="group"
			aria-label={label}
			bind:this={group}
		>
			{#each entries as entry (entry.key)}
				<button
					type="button"
					class={['arc-chip-group__chip', !entry.option && 'arc-chip-group__more']}
					data-chip={entry.option?.value}
					data-more={!entry.option ? '' : undefined}
					data-pop-key={entry.key}
					aria-pressed={entry.option ? entry.selected : undefined}
					aria-expanded={!entry.option ? expanded : undefined}
					tabindex={tabStop === entry.key ? 0 : -1}
					onfocus={() => {
						active = entry.key;
					}}
					onclick={() => {
						if (entry.option) toggle(entry.option.value);
						else toggleMore();
					}}
					onkeydown={onKeyDown}
					animate:positionFlip={reduced ? { duration: 0, easing: m.ease.standard } : m.spring.morph}
					in:swap={{
						...(reduced ? { duration: 150, easing: m.ease.standard } : m.spring.snappy),
						delay: reduced ? 0 : entry.delay,
						fade: { duration: reduced ? 150 : m.duration.fast, easing: m.ease.standard },
						skip: !mounted.current || !entry.option
					}}
					out:swap={{
						scale: reduced ? 1 : 0.9,
						duration: reduced ? 150 : m.duration.instant,
						easing: m.ease.standard,
						pop: layout.box(entry.key)
					}}
				>
					{#if entry.option}<ChipBody
							option={entry.option}
							selected={entry.selected}
							{reduced}
							delay={entry.delay}
							skipIntro={!mounted.current}
						/>{:else}<MoreBody text={expanded ? 'Show less' : `+${hidden} more`} {reduced} />{/if}
				</button>
			{/each}
		</div>
	</div>
</div>
