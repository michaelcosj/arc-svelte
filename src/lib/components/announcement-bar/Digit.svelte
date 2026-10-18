<script lang="ts">
	import { Mounted, swap, springCurve, motionTokens as m } from '#lib/motion';
	let { char, reduced }: { char: string; reduced: boolean } = $props();
	const mounted = new Mounted();
	const spring = springCurve({ visualDuration: 0.32, bounce: 0.08 }, 70);
</script>

<span class="arc-announcement-bar__digit"
	><span class="arc-announcement-bar__digit-sizer" aria-hidden="true">0</span>{#key char}<span
			class="arc-announcement-bar__digit-face"
			in:swap={{
				y: reduced ? 0 : '-70%',
				...spring,
				duration: reduced ? m.duration.instant : spring.duration,
				fade: reduced ? undefined : { duration: m.duration.fast, easing: m.ease.standard },
				skip: !mounted.current
			}}
			out:swap={{
				y: reduced ? 0 : '70%',
				...spring,
				duration: reduced ? m.duration.instant : spring.duration,
				fade: reduced ? undefined : { duration: m.duration.fast, easing: m.ease.standard }
			}}>{char}</span
		>{/key}</span
>
