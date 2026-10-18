<script lang="ts">
	import { untrack } from 'svelte';
	import { Mounted, swap, widthPresence, motionTokens as m, easeInOut } from '#lib/motion';
	let { value, reduced }: { value: number; reduced: boolean } = $props();
	const mounted = new Mounted();
	let track = $state(untrack(() => ({ value, direction: 1 })));
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (track.value !== next) track = { value: next, direction: next > track.value ? 1 : -1 };
		});
	});
	const digits = $derived([...String(value)]);
</script>

<span class="arc-password-strength__number"
	>{#each digits as digit, index (digits.length - 1 - index)}<span
			class="arc-password-strength__place"
			in:widthPresence={{
				skip: reduced || !mounted.current,
				fade: { duration: m.duration.fast, easing: easeInOut }
			}}
			out:widthPresence={{ skip: reduced, fade: { duration: m.duration.fast, easing: easeInOut } }}
			>{#key digit}<span
					class="arc-password-strength__digit"
					in:swap={{
						y: reduced ? 0 : `${0.45 * track.direction}em`,
						blur: reduced ? 0 : m.blur.subtle,
						...m.spring.snappy,
						duration: reduced ? m.duration.fast : m.spring.snappy.duration,
						fade: { duration: m.duration.fast },
						skip: !mounted.current
					}}
					out:swap={{
						y: reduced ? 0 : `${-0.45 * track.direction}em`,
						blur: reduced ? 0 : m.blur.subtle,
						duration: reduced ? m.duration.instant : m.duration.fast,
						easing: reduced ? easeInOut : m.ease.standard,
						pop: true
					}}>{digit}</span
				>{/key}</span
		>{/each}</span
>
