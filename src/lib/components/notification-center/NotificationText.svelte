<script lang="ts">
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	let { text, reduced }: { text: string; reduced: boolean } = $props();
	const mounted = new Mounted();
</script>

<span class="arc-notification-center__swap"
	>{#key text}<span
			class="arc-notification-center__swap-line"
			in:swap={{
				y: reduced ? 0 : '0.3em',
				blur: reduced ? 0 : 4,
				duration: reduced ? 0 : 240,
				easing: m.ease.enter,
				skip: !mounted.current
			}}
			out:swap={{
				y: reduced ? 0 : '-0.3em',
				blur: reduced ? 0 : 2,
				duration: reduced ? 120 : 160,
				easing: m.ease.standard,
				pop: true
			}}>{text}</span
		>{/key}</span
>
