<script lang="ts">
	import { untrack } from 'svelte';
	import Word from './Word.svelte';
	let { text }: { text: string } = $props();
	let previous = untrack(() => text),
		directions = $state<number[]>([]);
	const numberIn = (word?: string) => {
		const digits = word?.replace(/[^\d.-]/g, '');
		return digits && /\d/.test(digits) && Number.isFinite(Number(digits)) ? Number(digits) : null;
	};
	$effect.pre(() => {
		const next = text;
		untrack(() => {
			if (next === previous) return;
			const before = previous.split(' ');
			directions = next.split(' ').map((word, index) => {
				const a = numberIn(before[index]),
					b = numberIn(word);
				return a !== null && b !== null && b < a ? -1 : 1;
			});
			previous = next;
		});
	});
</script>

<span class="arc-number-field__srOnly">{text}</span><span
	class="arc-number-field__words"
	aria-hidden="true"
	>{#each text.split(' ') as word, index (index)}{#if index > 0}{' '}{/if}<Word
			{word}
			direction={directions[index] ?? 1}
		/>{/each}</span
>
