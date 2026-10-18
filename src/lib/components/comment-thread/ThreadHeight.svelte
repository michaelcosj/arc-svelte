<script lang="ts">
	import type { Snippet } from 'svelte';
	import { HeightMorph, springCurve } from '#lib/motion';
	let { children, reduced, morphKey }: { children?: Snippet; reduced: boolean; morphKey: string } =
		$props();
	const height = new HeightMorph(() => ({
		reduced,
		pinned: true,
		spring: springCurve({ visualDuration: 0.42, bounce: 0 })
	}));
	$effect.pre(() => {
		void morphKey;
		height.changed();
	});
</script>

<div class="arc-comment-thread__auto-height" {@attach height.body}>
	<div class="arc-comment-thread__auto-inner" {@attach height.content}>{@render children?.()}</div>
</div>
