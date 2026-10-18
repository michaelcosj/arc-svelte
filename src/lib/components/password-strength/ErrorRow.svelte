<script lang="ts">
	import {
		HeightMorph,
		Mounted,
		heightPresence,
		swap,
		motionTokens as m,
		easeInOut
	} from '#lib/motion';
	import { strengthCopy } from './motion';
	let {
		id,
		text,
		reduced,
		initial
	}: { id: string; text: string; reduced: boolean; initial: boolean } = $props();
	const mounted = new Mounted();
	const height = new HeightMorph(() => ({ reduced, follow: true }));
	const copy = $derived(strengthCopy(reduced, 1, !mounted.current));
</script>

<span
	class="arc-password-strength__error-slot"
	in:heightPresence|global={{
		reduced,
		skip: initial,
		fade: { duration: m.duration.fast, easing: easeInOut }
	}}
	out:heightPresence|global={{ reduced, fade: { duration: m.duration.instant, easing: easeInOut } }}
	><span {@attach height.body}
		><span {@attach height.content} {id} class="arc-password-strength__error"
			>{#key text}<span
					class="arc-password-strength__error-text"
					in:swap={copy.enter}
					out:swap={copy.exit}>{text}</span
				>{/key}</span
		></span
	></span
>
