<script lang="ts">
	import Digit from './Digit.svelte';
	let {
		to,
		label,
		reduced,
		onEnd
	}: { to: Date | string | number; label?: string; reduced: boolean; onEnd?: () => void } =
		$props();
	const target = $derived(new Date(to).getTime());
	let now = $state<number | null>(null);
	let ended = false;
	$effect(() => {
		const end = target;
		let timer: ReturnType<typeof setTimeout>;
		const tick = () => {
			const current = Date.now();
			now = current;
			if (current >= end) {
				if (!ended) {
					ended = true;
					onEnd?.();
				}
				return;
			}
			timer = setTimeout(tick, 1000 - (current % 1000) + 8);
		};
		timer = setTimeout(tick, 0);
		return () => clearTimeout(timer);
	});
	const total = $derived(Math.max(0, Math.floor((now === null ? 0 : target - now) / 1000)));
	const d = $derived(Math.floor(total / 86400)),
		h = $derived(Math.floor((total % 86400) / 3600)),
		min = $derived(Math.floor((total % 3600) / 60)),
		sec = $derived(total % 60);
	const pending = $derived(now === null);
	const spoken = $derived(pending ? '' : `${d ? `${d} days ` : ''}${h} hours ${min} minutes`);
</script>

{#snippet digits(
	value: number,
	padded = true
)}{#each [...(padded ? String(value).padStart(2, '0') : String(value))] as char, i ((padded ? String(value).padStart(2, '0') : String(value)).length - i)}<Digit
			char={pending ? '0' : char}
			{reduced}
		/>{/each}{/snippet}
<span class="arc-announcement-bar__countdown"
	>{#if label}<span class="arc-announcement-bar__countdown-label">{label}</span>{/if}<span
		role="timer"
		aria-live="off"
		aria-label={spoken}
		class="arc-announcement-bar__time"
		data-pending={pending || undefined}
		>{#if d}<span class="arc-announcement-bar__unit"
				>{@render digits(d, false)}<span class="arc-announcement-bar__unit-mark" aria-hidden="true"
					>d</span
				></span
			><span class="arc-announcement-bar__gap" aria-hidden="true"></span>{/if}{@render digits(
			h
		)}<span class="arc-announcement-bar__sep" aria-hidden="true">:</span>{@render digits(min)}<span
			class="arc-announcement-bar__sep"
			aria-hidden="true">:</span
		>{@render digits(sec)}</span
	></span
>
