<script lang="ts">
	import { Mounted, swap } from '#lib/motion';
	import { textIn, textOut } from './swap-text';

	let { text, candidates, reduced }: { text: string; candidates: string[]; reduced: boolean } =
		$props();

	const mounted = new Mounted();
	const unique = $derived([...new Set(candidates)]);
</script>

<!-- Every candidate sits in the same grid cell, so the box always has the width of the longest one
     and nothing around it moves when the text changes. -->
<span class="arc-billing-toggle__swap"
	>{#each unique as candidate (candidate)}<span
			class="arc-billing-toggle__swap-sizer"
			aria-hidden="true">{candidate}</span
		>{/each}{#key text}<span
			class="arc-billing-toggle__swap-text"
			in:swap={textIn(reduced, !mounted.current)}
			out:swap={textOut(reduced)}>{text}</span
		>{/key}</span
>
