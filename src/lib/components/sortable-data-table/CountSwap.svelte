<script lang="ts">
	import { Mounted, motionTokens as m, swap, WidthMorph } from '#lib/motion';
	let {
		value,
		direction,
		reduced,
		number = false
	}: { value: string; direction: number; reduced: boolean; number?: boolean } = $props();
	const mounted = new Mounted();
	const width = new WidthMorph(() => ({ reduced, follow: true, pinned: true }));
</script>

<span
	class={['arc-sortable-data-table__swap', number && 'arc-sortable-data-table__number']}
	{@attach width.body}
	><span class="arc-sortable-data-table__swap-inner" {@attach width.content}
		>{#key value}<span
				class="arc-sortable-data-table__swap-text"
				in:swap={{
					y: reduced ? 0 : `${0.3 * direction}em`,
					blur: reduced ? 0 : m.blur.soft,
					duration: reduced ? m.duration.instant : m.duration.standard,
					easing: m.ease.enter,
					skip: !mounted.current
				}}
				out:swap={{
					y: reduced ? 0 : `${-0.3 * direction}em`,
					blur: reduced ? 0 : m.blur.subtle,
					duration: reduced ? m.duration.instant : m.duration.fast,
					easing: m.ease.standard,
					pop: true
				}}>{value}</span
			>{/key}</span
	></span
>
