<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { flip } from 'svelte/animate';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import X from '@lucide/svelte/icons/x';
	import { HeightMorph, Mounted, motionTokens as m, swap } from '#lib/motion';
	import {
		formatShortcut,
		normalizeShortcut,
		shortcutFromEvent,
		shortcutTokens,
		splitShortcut,
		RESERVED
	} from './shortcut';
	import { usePlatform } from './shortcut-state.svelte';
	import ShortcutKbd from './ShortcutKbd.svelte';
	import type { ShortcutRecorderProps, ShortcutBinding } from './types';
	import './shortcut-recorder.css';
	let {
		label,
		hideLabel = false,
		value = $bindable(undefined),
		defaultValue = null,
		onValueChange,
		resetValue,
		bindings = [],
		warnReserved = true,
		requireModifier = true,
		platform: override,
		placeholder = 'Record shortcut',
		description,
		disabled = false,
		id,
		class: className
	}: ShortcutRecorderProps = $props();
	const uid = $props.id(),
		buttonId = $derived(id ?? `${uid}-button`),
		labelId = `${uid}-label`,
		messageId = `${uid}-message`,
		detected = usePlatform(),
		platform = $derived(override ?? detected.current),
		mounted = new Mounted(),
		reduced = $derived(mounted.current && Boolean(prefersReducedMotion.current));
	let inner = $state(untrack(() => defaultValue)),
		recording = $state(false),
		live = $state<string[]>([]),
		pending = $state<{ shortcut: string; conflict: ShortcutBinding; reserved: boolean } | null>(
			null
		),
		nudge = $state<string | null>(null),
		settled = $state(0),
		announcement = $state(''),
		button = $state<HTMLButtonElement>();
	const current = $derived(value === undefined ? inner : value),
		restoreTo = $derived(resetValue === undefined ? defaultValue : resetValue),
		shown = $derived(pending?.shortcut ?? current),
		tokens = $derived(
			recording
				? shortcutTokens(live.join('+'), platform)
				: shown
					? shortcutTokens(shown, platform)
					: []
		),
		phase = $derived(recording ? 'recording' : pending ? 'conflict' : 'idle'),
		canReset = $derived(
			!recording && (pending !== null || (current ?? null) !== (restoreTo ?? null))
		),
		canClear = $derived(!recording && Boolean(current) && !pending);
	const message = $derived(
		pending
			? {
					key: `c-${pending.shortcut}`,
					tone: 'warning',
					text: pending.reserved ? 'Reserved for' : 'Already used by'
				}
			: nudge
				? { key: `n-${nudge}`, tone: 'hint', text: nudge }
				: recording
					? { key: 'rec', tone: 'hint', text: 'Esc to cancel, Backspace to clear' }
					: description
						? { key: 'd', tone: 'hint', text: description }
						: null
	);
	const height = new HeightMorph(() => ({ reduced, follow: true, pinned: true }));
	$effect(() => {
		if (!settled) return;
		const timer = setTimeout(() => (settled = 0), 700);
		return () => clearTimeout(timer);
	});
	function commit(next: string | null, replaced?: ShortcutBinding) {
		pending = null;
		nudge = null;
		if (value === undefined) inner = next;
		else if (!onValueChange) value = next;
		onValueChange?.(next, { replaced });
		settled++;
		announcement = next
			? `Shortcut set to ${formatShortcut(next, platform).spoken}`
			: 'Shortcut cleared';
	}
	function start() {
		if (disabled) return;
		pending = null;
		nudge = null;
		live = [];
		recording = true;
		announcement = 'Recording. Press the new shortcut, or Escape to cancel.';
	}
	function stop() {
		recording = false;
		live = [];
	}
	function mods(e: KeyboardEvent) {
		const a: string[] = [];
		if (e.ctrlKey && platform === 'mac') a.push('ctrl');
		if (e.altKey) a.push('alt');
		if (e.shiftKey) a.push('shift');
		if (platform === 'mac' ? e.metaKey : e.ctrlKey) a.push('mod');
		if (platform === 'other' && e.metaKey) a.push('meta');
		return a;
	}
	function keydown(e: KeyboardEvent) {
		if (!recording) {
			if (['Backspace', 'Delete'].includes(e.key) && current) {
				e.preventDefault();
				commit(null);
			}
			return;
		}
		if (e.key === 'Tab' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
			stop();
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		const bare = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
		if (bare && e.key === 'Escape') {
			stop();
			announcement = 'Recording canceled';
			return;
		}
		if (bare && ['Backspace', 'Delete'].includes(e.key)) {
			stop();
			commit(null);
			return;
		}
		const chord = shortcutFromEvent(e, platform);
		if (!chord) {
			live = mods(e);
			return;
		}
		const { mods: parts, key } = splitShortcut(chord),
			strong = ['mod', 'ctrl', 'alt', 'meta'].some((m) =>
				parts.has(m as 'mod' | 'ctrl' | 'alt' | 'meta')
			);
		if (requireModifier && !strong && !/^f\d+$/.test(key)) {
			nudge = platform === 'mac' ? 'Include ⌘, ⌃, or ⌥' : 'Include Ctrl or Alt';
			announcement = nudge;
			live = mods(e);
			return;
		}
		stop();
		const normal = normalizeShortcut(chord, platform),
			same = current && normalizeShortcut(current, platform) === normal,
			taken = same
				? undefined
				: bindings.find((b) => normalizeShortcut(b.shortcut, platform) === normal),
			reserved =
				!same && warnReserved
					? RESERVED.find((b) => normalizeShortcut(b.shortcut, platform) === normal)
					: undefined;
		if (taken || reserved) {
			pending = { shortcut: chord, conflict: (taken ?? reserved)!, reserved: !taken };
			announcement = `${formatShortcut(chord, platform).spoken} is ${pending.reserved ? 'reserved for' : 'used by'} ${pending.conflict.label}. Use anyway, or record another.`;
		} else commit(chord);
	}
</script>

<div class={['arc-shortcut-recorder__field', className]} data-disabled={disabled || undefined}>
	<span
		id={labelId}
		class={hideLabel ? 'arc-shortcut-recorder__sr-only' : 'arc-shortcut-recorder__label'}
		>{label}</span
	>
	<div class="arc-shortcut-recorder__control" data-state={phase}>
		<button
			bind:this={button}
			id={buttonId}
			type="button"
			class="arc-shortcut-recorder__recorder"
			{disabled}
			aria-labelledby={`${labelId} ${buttonId}`}
			aria-describedby={message ? messageId : undefined}
			aria-pressed={recording}
			onclick={(e) => {
				if (recording) {
					if (e.detail !== 0) {
						stop();
						announcement = 'Recording canceled';
					}
					return;
				}
				start();
			}}
			onkeydown={keydown}
			onkeyup={(e) => {
				if (recording) live = mods(e);
			}}
			onblur={() => {
				if (recording) {
					stop();
					nudge = null;
				}
			}}
		>
			<span class="arc-shortcut-recorder__sr-only"
				>{recording
					? 'Recording'
					: shown
						? formatShortcut(shown, platform).spoken
						: placeholder}</span
			><span class="arc-shortcut-recorder__row" aria-hidden="true"
				>{#if recording}<span class="arc-shortcut-recorder__dot" data-reduced={reduced || undefined}
					></span>{/if}
				{#each tokens as token, index (token.id)}<span
						class="arc-shortcut-recorder__chip-slot"
						animate:flip={{ ...(reduced ? { duration: 0 } : m.spring.snappy) }}
						in:swap={{
							scale: reduced ? 1 : 0.72,
							y: reduced ? 0 : 4,
							blur: reduced ? 0 : 2,
							...(reduced ? { duration: 100 } : m.spring.snappy),
							delay: reduced ? 0 : (recording ? 0 : index) * m.stagger.item,
							fade: { duration: 140 },
							skip: !mounted.current
						}}
						out:swap={{
							scale: reduced ? 1 : 0.8,
							blur: reduced ? 0 : 2,
							duration: reduced ? 60 : 100,
							pop: true
						}}
						><ShortcutKbd
							pressed={recording || (settled > 0 && !pending)}
							data-tone={pending ? 'warning' : undefined}
							label={token.label}
						/></span
					>{/each}
				{#each tokens.length ? [] : [recording ? 'prompt' : 'placeholder'] as key (key)}<span
						class="arc-shortcut-recorder__placeholder"
						data-recording={recording || undefined}
						in:swap={{
							y: reduced ? 0 : 4,
							blur: reduced ? 0 : 2,
							duration: reduced ? 100 : 160,
							easing: m.ease.enter,
							skip: !mounted.current
						}}
						out:swap={{ duration: 80, pop: true }}>{recording ? 'Press keys' : placeholder}</span
					>{/each}
			</span></button
		><span class="arc-shortcut-recorder__actions">
			{#each canReset ? ['reset'] : [] as key (key)}<button
					type="button"
					class="arc-shortcut-recorder__action"
					aria-label={`Reset to ${restoreTo ? formatShortcut(restoreTo, platform).spoken : 'none'}`}
					onclick={() => {
						commit(restoreTo ?? null);
						button?.focus();
					}}
					in:swap={{ scale: 0.6, ...m.spring.snappy, skip: reduced || !mounted.current }}
					out:swap={{ scale: 0.6, duration: reduced ? 0 : 100 }}
					><RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" /></button
				>{/each}
			{#each canClear ? ['clear'] : [] as key (key)}<button
					type="button"
					class="arc-shortcut-recorder__action"
					aria-label="Clear shortcut"
					onclick={() => {
						commit(null);
						button?.focus();
					}}
					in:swap={{ scale: 0.6, ...m.spring.snappy, skip: reduced || !mounted.current }}
					out:swap={{ scale: 0.6, duration: reduced ? 0 : 100 }}
					><X size={16} strokeWidth={1.75} aria-hidden="true" /></button
				>{/each}
		</span>
	</div>
	<div class="arc-shortcut-recorder__message-slot" {@attach height.body}>
		<div style="position:relative" {@attach height.content}>
			{#each message ? [message] : [] as item (item.key)}<div
					id={messageId}
					class="arc-shortcut-recorder__message"
					data-tone={item.tone}
					in:swap={{
						y: reduced ? 0 : '0.35em',
						blur: reduced ? 0 : 4,
						duration: reduced ? 100 : 240,
						easing: m.ease.enter,
						skip: !mounted.current
					}}
					out:swap={{ duration: 80, pop: true }}
				>
					<span class="arc-shortcut-recorder__message-text"
						>{item.text}{#if pending}{' '}<strong class="arc-shortcut-recorder__strong"
								>{pending.conflict.label}</strong
							>{/if}</span
					>{#if pending}<span class="arc-shortcut-recorder__message-actions"
							><button
								type="button"
								class="arc-shortcut-recorder__link"
								onclick={() => {
									if (!pending) return;
									const taken = pending;
									commit(taken.shortcut, taken.reserved ? undefined : taken.conflict);
									button?.focus();
								}}>Use anyway</button
							><button
								type="button"
								class="arc-shortcut-recorder__link"
								data-quiet=""
								onclick={() => {
									pending = null;
									announcement = 'Kept the previous shortcut';
									button?.focus();
								}}>Cancel</button
							></span
						>{/if}
				</div>{/each}
		</div>
	</div>
	<span class="arc-shortcut-recorder__sr-only" role="status" aria-live="polite">{announcement}</span
	>
</div>
