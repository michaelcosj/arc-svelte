<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Copy from '@lucide/svelte/icons/copy';
	import Link2 from '@lucide/svelte/icons/link-2';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	let {
		label,
		onCopy,
		reduced,
		path = false,
		focusable = false,
		class: className
	}: {
		label: string;
		onCopy: () => Promise<void>;
		reduced: boolean;
		path?: boolean;
		focusable?: boolean;
		class?: string;
	} = $props();
	let phase = $state('idle');
	const mounted = new Mounted();
	const Icon = $derived(phase === 'done' ? Check : phase === 'error' ? X : path ? Link2 : Copy);
	let timer: ReturnType<typeof setTimeout>;
	function cleanup() {
		return () => clearTimeout(timer);
	}
	async function run(e: MouseEvent) {
		e.stopPropagation();
		clearTimeout(timer);
		try {
			await onCopy();
			phase = 'done';
		} catch {
			phase = 'error';
		}
		timer = setTimeout(() => (phase = 'idle'), 1400);
	}
</script>

<button
	type="button"
	tabindex={focusable ? undefined : -1}
	class={['arc-json-viewer__action', className]}
	data-state={phase}
	aria-label={phase === 'done' ? 'Copied' : phase === 'error' ? 'Copy failed' : label}
	title={label}
	onclick={run}
	{@attach cleanup}
	>{#key phase}<span
			class="arc-json-viewer__action-glyph"
			in:swap={{
				scale: reduced ? 1 : 0.6,
				blur: reduced ? 0 : 2,
				...(reduced ? { duration: 120 } : m.spring.snappy),
				fade: { duration: 120 },
				skip: !mounted.current
			}}
			out:swap={{ scale: reduced ? 1 : 0.6, blur: reduced ? 0 : 2, duration: 120, pop: true }}
			><Icon size={14} strokeWidth={phase === 'idle' ? 1.75 : 2} aria-hidden="true" /></span
		>{/key}</button
>
