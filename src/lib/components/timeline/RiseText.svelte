<script lang="ts">
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	let {
		text,
		reduced,
		direction = 1
	}: { text: string; reduced: boolean; direction?: number } = $props();
	const mounted = new Mounted();
</script>

<span class="arc-timeline__rise" aria-hidden="true"
	>{#key text}<span
			class="arc-timeline__rise-line"
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
				duration: reduced ? 0 : m.duration.fast,
				easing: m.ease.standard,
				pop: true
			}}>{text}</span
		>{/key}</span
>
