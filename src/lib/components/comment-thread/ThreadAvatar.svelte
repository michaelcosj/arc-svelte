<script lang="ts">
	import type { CommentAuthor } from './types';
	let { author, size = 28 }: { author: CommentAuthor; size?: number } = $props();
</script>

{#if author.avatar}<img
		class="arc-comment-thread__avatar"
		src={author.avatar}
		alt=""
		width={size}
		height={size}
		style:width={`${size}px`}
		style:height={`${size}px`}
	/>{:else}<span
		class="arc-comment-thread__avatar"
		style:width={`${size}px`}
		style:height={`${size}px`}
		style:font-size={`${Math.round(size * 0.38)}px`}
		aria-hidden="true"
		>{author.name
			.split(/\s+/)
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()}</span
	>{/if}
