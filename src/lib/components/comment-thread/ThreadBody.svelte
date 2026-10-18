<script lang="ts">
	import type { CommentAuthor } from './types';
	let { text, people }: { text: string; people: CommentAuthor[] } = $props();
	const parts = $derived.by(() => {
		const names = people
			.map((p) => p.name)
			.sort((a, b) => b.length - a.length)
			.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		return names.length ? text.split(new RegExp(`(@(?:${names.join('|')}))`, 'g')) : [text];
	});
</script>

<p class="arc-comment-thread__body">
	{#each parts as part, i (i)}{#if i % 2}<span class="arc-comment-thread__mention">{part}</span
			>{:else}{part}{/if}{/each}
</p>
