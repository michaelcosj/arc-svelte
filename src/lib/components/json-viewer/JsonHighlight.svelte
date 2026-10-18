<script lang="ts">
	let { text, needle, current }: { text: string; needle: string; current: boolean } = $props();
	const parts = $derived.by(() => {
		if (!needle) return [{ text, mark: false }];
		const out: { text: string; mark: boolean }[] = [];
		let from = 0,
			at = text.toLowerCase().indexOf(needle);
		while (at !== -1) {
			if (at > from) out.push({ text: text.slice(from, at), mark: false });
			out.push({ text: text.slice(at, at + needle.length), mark: true });
			from = at + needle.length;
			at = text.toLowerCase().indexOf(needle, from);
		}
		if (from < text.length) out.push({ text: text.slice(from), mark: false });
		return out;
	});
</script>

{#each parts as part, index (index)}{#if part.mark}<mark
			class="arc-json-viewer__mark"
			data-current={current || undefined}>{part.text}</mark
		>{:else}{part.text}{/if}{/each}
