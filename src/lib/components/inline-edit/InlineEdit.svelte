<script lang="ts">
	import { flushSync, tick, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		easeInOut,
		HeightMorph,
		Mounted,
		motionTokens as m,
		swap,
		WidthMorph
	} from '#lib/motion';
	import InlineMessage from './InlineMessage.svelte';
	import InlineStatus from './InlineStatus.svelte';
	import type { EditMessage, EditPhase, InlineEditProps } from './types';
	import './inline-edit.css';

	let {
		value,
		onSave,
		label,
		validate,
		placeholder = '',
		multiline = false,
		variant = 'title',
		as: Tag = 'span',
		class: className
	}: InlineEditProps = $props();
	const id = $props.id(),
		displayHintId = `${id}-display`,
		editHintId = `${id}-edit`,
		messageId = `${id}-message`;
	const mounted = new Mounted(),
		reduced = $derived(mounted.current && Boolean(prefersReducedMotion.current));
	let committed = $state(untrack(() => value)),
		shown = $state(untrack(() => value)),
		draft = $state(untrack(() => value));
	let seen = untrack(() => value);
	let layer = $state({ key: 0, direction: 1 });
	let editing = $state(false),
		error = $state<string | null>(null);
	let status = $state<{
		phase: EditPhase;
		failed: string | null;
		flash: 'on' | 'off' | null;
		announcement: string;
	}>({ phase: 'idle', failed: null, flash: null, announcement: '' });
	let root = $state<HTMLDivElement>(),
		display = $state<HTMLButtonElement>(),
		control = $state<HTMLInputElement | HTMLTextAreaElement>();
	let saveRun = 0;
	const timers: ReturnType<typeof setTimeout>[] = [];
	let wasEditing = false,
		typing = false;
	const layerText = $derived(editing ? draft : shown);
	const text = $derived(
		(layerText || placeholder || '\u200b') + (multiline && editing ? '\u200b' : '')
	);
	const noun = $derived(label.toLowerCase());
	const slot = $derived(editing ? 'edit' : status.phase);
	const message = $derived<EditMessage | null>(
		error
			? { key: `error:${error}`, tone: 'error', text: error, retry: false }
			: status.failed && !editing
				? {
						key: `failed:${status.failed}`,
						tone: 'failed',
						text: `Couldn’t save “${status.failed}”, so the last saved ${noun} is back.`,
						retry: true
					}
				: null
	);
	const describedBy = (hint: string) =>
		[hint, message ? messageId : null].filter(Boolean).join(' ');
	const width = new WidthMorph(() => ({
		reduced,
		pinned: true,
		observeBox: 'border-box',
		contentKey: `${editing}:${layerText}`,
		spec: typing ? { visualDuration: m.duration.fast / 1000, bounce: 0 } : m.specs.morph
	}));
	const height = new HeightMorph(() => ({ reduced, pinned: true, clip: false }));
	$effect.pre(() => {
		const external = value;
		untrack(() => {
			if (external === seen) return;
			seen = external;
			if (external === committed) return;
			committed = external;
			if (!editing && status.phase !== 'saving' && external !== shown) {
				shown = external;
				layer = { key: layer.key + 1, direction: 1 };
			}
		});
	});
	$effect.pre(() => {
		void layerText;
		const mode = editing;
		untrack(() => {
			typing = mode && wasEditing;
			wasEditing = mode;
			width.changed();
			height.changed();
		});
	});
	function observeDisplay(node: HTMLButtonElement) {
		const measure = () => {
			if (multiline && control) {
				control.style.height = `${parseFloat(getComputedStyle(node).height)}px`;
				control.scrollTop = 0;
			}
		};
		const observer = new ResizeObserver(measure);
		observer.observe(node, { box: 'border-box' });
		return () => observer.disconnect();
	}
	function cleanup() {
		return () => {
			saveRun += 1;
			timers.forEach(clearTimeout);
		};
	}
	function later(fn: () => void, ms: number) {
		timers.push(setTimeout(fn, ms));
	}
	function focusDisplay() {
		void tick().then(() => {
			if (!editing) display?.focus({ preventScroll: true });
		});
	}
	function startEdit(at: number | 'all', next = shown) {
		if (editing || status.phase === 'saving') return;
		flushSync(() => {
			draft = next;
			editing = true;
			error = null;
			status.failed = null;
			status.flash = null;
			status.phase = 'idle';
		});
		control?.focus({ preventScroll: true });
		if (at === 'all') control?.select();
		else control?.setSelectionRange(at, at);
	}
	function caretAt(x: number, y: number) {
		const node = display?.querySelector(`[data-layer="${layer.key}"]`)?.firstChild;
		if (!node || !shown) return shown.length;
		const doc = document as Document & {
			caretPositionFromPoint?: (
				x: number,
				y: number
			) => { offsetNode: Node; offset: number } | null;
			caretRangeFromPoint?: (x: number, y: number) => Range | null;
		};
		const position = doc.caretPositionFromPoint?.(x, y);
		if (position)
			return position.offsetNode === node ? Math.min(position.offset, shown.length) : shown.length;
		const range = doc.caretRangeFromPoint?.(x, y);
		return range && range.startContainer === node
			? Math.min(range.startOffset, shown.length)
			: shown.length;
	}
	const clean = (text: string) => (multiline ? text.trim() : text.replace(/\s+/g, ' ').trim());
	function submit(source: 'key' | 'button' | 'blur') {
		if (!editing) return;
		const next = clean(draft),
			problem = validate?.(next) || null;
		if (problem) {
			error = problem;
			if (source !== 'blur') control?.focus();
			return;
		}
		editing = false;
		error = null;
		if (source !== 'blur') focusDisplay();
		if (next !== draft) layer = { key: layer.key + 1, direction: 1 };
		if (next === shown) return;
		const previous = committed,
			run = ++saveRun;
		shown = next;
		status.phase = 'saving';
		status.announcement = `Saving ${noun}`;
		void Promise.resolve()
			.then(() => onSave(next))
			.then(
				() => {
					if (run !== saveRun) return;
					committed = next;
					status.phase = 'saved';
					status.announcement = `${label} saved`;
					later(() => {
						if (status.phase === 'saved') status.phase = 'idle';
					}, 1800);
				},
				() => {
					if (run !== saveRun) return;
					shown = previous;
					layer = { key: layer.key + 1, direction: -1 };
					status.phase = 'failed';
					status.failed = next;
					status.flash = 'on';
					status.announcement = '';
					later(() => {
						if (status.flash === 'on') status.flash = 'off';
					}, 1400);
					later(() => {
						if (status.flash === 'off') status.flash = null;
					}, 2000);
				}
			);
	}
	function cancel() {
		editing = false;
		error = null;
		focusDisplay();
		if (draft !== shown) layer = { key: layer.key + 1, direction: -1 };
	}
	function retry() {
		if (status.failed) startEdit(status.failed.length, status.failed);
	}
	function onInput(event: Event & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) {
		draft = event.currentTarget.value;
		if (error) error = validate?.(clean(draft)) || null;
	}
	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			cancel();
		} else if (event.key === 'Enter' && !event.isComposing && !(multiline && event.shiftKey)) {
			event.preventDefault();
			submit('key');
		}
	}
	function onFocusOut(event: FocusEvent) {
		if (!editing) return;
		const next = event.relatedTarget as Node | null;
		if (next && root?.contains(next)) return;
		if (!next && !document.hasFocus()) return;
		submit('blur');
	}
</script>

<div
	bind:this={root}
	class={['arc-inline-edit__root', className]}
	data-variant={variant}
	data-multiline={multiline || undefined}
	data-editing={editing || undefined}
	data-phase={status.phase}
	data-invalid={error ? '' : undefined}
	data-flash={status.flash ?? undefined}
	onfocusout={onFocusOut}
	{@attach cleanup}
>
	<svelte:element this={Tag} class="arc-inline-edit__line">
		<span class="arc-inline-edit__box" {@attach multiline ? height.body : undefined}>
			<button
				bind:this={display}
				type="button"
				class="arc-inline-edit__display"
				onclick={(event) =>
					startEdit(event.detail === 0 ? 'all' : caretAt(event.clientX, event.clientY))}
				tabindex={editing ? -1 : undefined}
				aria-label={`${label}: ${shown || placeholder}`}
				aria-describedby={describedBy(displayHintId)}
				aria-disabled={status.phase === 'saving' || undefined}
				{@attach multiline ? height.content : width.content}
				{@attach observeDisplay}
			>
				<span class="arc-inline-edit__layer" data-empty={layerText ? undefined : ''}
					>{#key layer.key}<span
							data-layer={layer.key}
							class="arc-inline-edit__text"
							in:swap={{
								y: reduced ? 0 : `${layer.direction * 0.3}em`,
								blur: reduced ? 0 : m.blur.soft,
								duration: reduced ? m.duration.fast : m.duration.standard,
								easing: reduced ? easeInOut : m.ease.enter,
								skip: !mounted.current
							}}
							out:swap={{
								y: reduced ? 0 : `${layer.direction * -0.3}em`,
								blur: reduced ? 0 : m.blur.subtle,
								duration: reduced ? m.duration.instant : m.duration.fast,
								easing: reduced ? easeInOut : m.ease.standard,
								pop: true
							}}>{text}</span
						>{/key}</span
				>
			</button>
			{#if editing}
				{#if multiline}<textarea
						bind:this={control}
						class="arc-inline-edit__control"
						value={draft}
						oninput={onInput}
						onkeydown={onKeyDown}
						{placeholder}
						aria-label={label}
						aria-invalid={error ? true : undefined}
						aria-describedby={describedBy(editHintId)}
						autocomplete="off"
						spellcheck={variant === 'body'}
						rows="1"
						enterkeyhint="done"></textarea>
				{:else}<input
						bind:this={control}
						class="arc-inline-edit__control"
						type="text"
						value={draft}
						oninput={onInput}
						onkeydown={onKeyDown}
						{placeholder}
						aria-label={label}
						aria-invalid={error ? true : undefined}
						aria-describedby={describedBy(editHintId)}
						autocomplete="off"
						spellcheck={variant === 'body'}
						enterkeyhint="done"
					/>{/if}
			{/if}
			<span class="arc-inline-edit__frame" {@attach !multiline ? width.body : undefined}
				><InlineStatus
					{slot}
					{noun}
					{reduced}
					onSave={() => submit('button')}
					onCancel={cancel}
					onStart={() => startEdit(shown.length)}
				/></span
			>
		</span>
	</svelte:element>
	<InlineMessage id={messageId} {message} {reduced} onRetry={retry} />
	<span id={displayHintId} class="arc-inline-edit__sr-only">Activate to edit.</span>
	<span id={editHintId} class="arc-inline-edit__sr-only"
		>{multiline
			? 'Enter saves, Shift+Enter adds a line break, Escape cancels.'
			: 'Enter saves, Escape cancels.'}</span
	>
	<span class="arc-inline-edit__sr-only" role="status">{status.announcement}</span>
</div>
