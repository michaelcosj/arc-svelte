<script lang="ts">
	let { text, query }: { text: string; query: string } = $props();
	const at = $derived(query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1);
</script>

{#if at < 0}{text}{:else}{text.slice(0, at)}<mark class="arc-mention-input__match"
		>{text.slice(at, at + query.length)}</mark
	>{text.slice(at + query.length)}{/if}
