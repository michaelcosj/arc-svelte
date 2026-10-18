<script lang="ts">
	import { HeightMorph, Mounted, contentSwap, swap } from '#lib/motion';
	let {
		text,
		class: className,
		reduced
	}: { text?: string; class?: string; reduced: boolean } = $props();
	const mounted = new Mounted();
	const height = new HeightMorph(() => ({
		reduced,
		pinned: true,
		measure: 'offset',
		clip: false,
		window: 700
	}));
	const motion = $derived(contentSwap(reduced, mounted.current));
	$effect.pre(() => {
		void text;
		height.changed();
	});
</script>

<span class="arc-stepper__slot" {@attach height.body}
	><span class="arc-stepper__slot-inner" {@attach height.content}
		>{#each text ? [text] : [] as copy (`${className}:${copy}`)}<span
				class={className}
				in:swap={{ ...motion.textIn, duration: reduced ? 0 : motion.textIn.duration }}
				out:swap={{ ...motion.textOut, duration: reduced ? 0 : motion.textOut.duration }}
				>{copy}</span
			>{/each}</span
	></span
>
