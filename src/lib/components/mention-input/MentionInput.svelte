<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import Hash from '@lucide/svelte/icons/hash';
	import { Highlight as HighlightMotion, swap, motionTokens as m } from '#lib/motion';
	import type {
		MentionInputProps,
		MentionInputHandle,
		Mention,
		MentionValue,
		MentionKind
	} from './types';
	import {
		EMPTY,
		SYMBOL,
		mentionText,
		reconcile,
		findTrigger,
		rank,
		initials,
		type Suggestion
	} from './model';
	import Highlight from './Highlight.svelte';
	import './mention-input.css';
	let {
		value: valueProp,
		defaultValue,
		onChange,
		people,
		channels,
		onMentionAdd,
		onSubmit,
		submitOnEnter = false,
		placeholder,
		minRows = 1,
		maxRows = 8,
		placement = 'auto',
		maxSuggestions = 6,
		disabled,
		name,
		id,
		'aria-label': ariaLabel,
		'aria-describedby': describedBy,
		class: className,
		ref = $bindable(null)
	}: MentionInputProps = $props();
	const uid = $props.id(),
		listId = `${uid}-list`;
	const reduced = $derived(!!prefersReducedMotion.current);
	let inner = $state<MentionValue>(untrack(() => defaultValue ?? EMPTY));
	const value = $derived(valueProp ?? inner);
	// Keep the optimistic edit until the parent changes the value or rejection reconciles it.
	let live = $derived(value);
	let root = $state<HTMLDivElement>();
	let field = $state<HTMLDivElement>();
	let area = $state<HTMLTextAreaElement>();
	let backdrop = $state<HTMLDivElement>();
	let body = $state<HTMLDivElement>();
	let list = $state<HTMLUListElement>();
	let lastCaret = 0;
	let pending: Mention | null = null;
	let caret = $state<number | null>(null),
		focused = $state(false);
	const trigger = $derived(
		caret === null
			? null
			: findTrigger(value.text, caret, value.mentions, {
					person: !!people?.length,
					channel: !!channels?.length
				})
	);
	const suggestions = $derived.by(() => {
		if (!trigger) return [];
		const query = trigger.query.toLowerCase().trim();
		const scored =
			trigger.kind === 'person'
				? (people ?? []).map((item) => ({
						entry: { kind: 'person', item } as Suggestion,
						score: rank(item.name, item.role ?? '', query)
					}))
				: (channels ?? []).map((item) => ({
						entry: { kind: 'channel', item } as Suggestion,
						score: rank(item.name, item.description ?? '', query)
					}));
		return scored
			.filter((entry) => entry.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, maxSuggestions)
			.map((entry) => entry.entry);
	});
	const queryKey = $derived(trigger ? `${trigger.start}:${trigger.query}` : '');
	const triggerStart = $derived(trigger?.start);
	// Navigation overrides last until the query changes; Escape dismissal lasts for this trigger.
	let active = $derived.by(() => {
		void queryKey;
		return 0;
	});
	let dismissed = $derived.by<number | null>(() => {
		void triggerStart;
		return null;
	});
	const open = $derived(
		focused &&
			!disabled &&
			!!trigger &&
			trigger.start !== dismissed &&
			(suggestions.length > 0 || !trigger.query.includes(' '))
	);
	const activeIndex = $derived(Math.min(active, Math.max(0, suggestions.length - 1)));
	function commit(next: MentionValue) {
		live = next;
		if (valueProp === undefined) inner = next;
		onChange?.(next);
		if (valueProp !== undefined)
			queueMicrotask(() => {
				live = value;
				if (area && area.value !== value.text) area.value = value.text;
			});
	}
	function select() {
		if (!area) return;
		let start = area.selectionStart,
			end = area.selectionEnd;
		const collapsed = start === end;
		for (const mention of live.mentions) {
			if (collapsed && start > mention.start && start < mention.end) {
				const stepped = Math.abs(start - lastCaret) === 1,
					forward = start > lastCaret;
				start = end = stepped
					? forward
						? mention.end
						: mention.start
					: start - mention.start < mention.end - start
						? mention.start
						: mention.end;
			} else if (!collapsed) {
				if (start > mention.start && start < mention.end) start = mention.start;
				if (end > mention.start && end < mention.end) end = mention.end;
			}
		}
		if (start !== area.selectionStart || end !== area.selectionEnd)
			area.setSelectionRange(start, end, area.selectionDirection);
		lastCaret = area.selectionStart;
		caret = collapsed ? start : null;
	}
	// React's synthetic onSelect also observes collapsed caret movement; native select alone does not.
	$effect(() => {
		const node = area;
		if (!node) return;
		const changed = () => {
			if (document.activeElement === node) select();
		};
		node.addEventListener('selectionchange', changed);
		document.addEventListener('selectionchange', changed);
		return () => {
			node.removeEventListener('selectionchange', changed);
			document.removeEventListener('selectionchange', changed);
		};
	});
	function input(event: Event & { currentTarget: EventTarget & HTMLTextAreaElement }) {
		const text = event.currentTarget.value;
		const mentions = reconcile(live, text, lastCaret);
		const added = pending;
		pending = null;
		if (added && text.slice(added.start, added.end) === mentionText(added.kind, added.label)) {
			mentions.push(added);
			mentions.sort((a, b) => a.start - b.start);
		}
		commit({ text, mentions });
		if (added) onMentionAdd?.(added);
		lastCaret = event.currentTarget.selectionStart;
		caret =
			event.currentTarget.selectionStart === event.currentTarget.selectionEnd
				? event.currentTarget.selectionStart
				: null;
	}
	function typeText(text: string, from?: number, to?: number) {
		if (!area) return;
		area.focus({ preventScroll: true });
		if (from !== undefined) area.setSelectionRange(from, to ?? from);
		lastCaret = area.selectionStart;
		if (
			typeof document.execCommand === 'function' &&
			document.execCommand('insertText', false, text)
		)
			return;
		const start = area.selectionStart,
			end = area.selectionEnd;
		const nextText = live.text.slice(0, start) + text + live.text.slice(end);
		const mentions = reconcile(live, nextText, start);
		const added = pending;
		pending = null;
		if (added) mentions.push(added);
		mentions.sort((a, b) => a.start - b.start);
		commit({ text: nextText, mentions });
		if (added) onMentionAdd?.(added);
		requestAnimationFrame(() => {
			area?.setSelectionRange(start + text.length, start + text.length);
			caret = start + text.length;
		});
	}
	function choose(suggestion: Suggestion | undefined) {
		if (!suggestion || !trigger || caret === null) return;
		const label = suggestion.item.name,
			token = mentionText(suggestion.kind, label);
		pending = {
			kind: suggestion.kind,
			id: suggestion.item.id,
			label,
			start: trigger.start,
			end: trigger.start + token.length
		};
		const after = value.text[caret];
		typeText(after === undefined || !/\s/.test(after) ? `${token} ` : token, trigger.start, caret);
	}
	function keydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLTextAreaElement }) {
		const node = event.currentTarget;
		lastCaret = node.selectionStart;
		if (open) {
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				if (suggestions.length)
					active =
						(activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) %
						suggestions.length;
				return;
			}
			if ((event.key === 'Enter' || event.key === 'Tab') && suggestions.length && !event.shiftKey) {
				event.preventDefault();
				choose(suggestions[activeIndex]);
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				dismissed = trigger?.start ?? null;
				return;
			}
		}
		const start = node.selectionStart,
			end = node.selectionEnd;
		if (start === end && !event.metaKey && (event.key === 'Backspace' || event.key === 'Delete')) {
			const hit = live.mentions.find((mention) =>
				event.key === 'Backspace'
					? start > mention.start && start <= mention.end
					: start >= mention.start && start < mention.end
			);
			if (hit) node.setSelectionRange(hit.start, hit.end);
			return;
		}
		if (event.key === 'Enter' && submitOnEnter && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			if (live.text.trim()) onSubmit?.(live);
		}
	}
	const handle: MentionInputHandle = {
		focus: () => area?.focus(),
		insert: (text) => typeText(text),
		openSuggestions: (kind) => {
			if (!area) return;
			const at = document.activeElement === area ? area.selectionStart : live.text.length;
			const before = live.text[at - 1];
			dismissed = null;
			typeText(
				`${before && !/\s/.test(before) ? ' ' : ''}${SYMBOL[kind]}`,
				at,
				document.activeElement === area ? area.selectionEnd : at
			);
		},
		clear: () => {
			commit(EMPTY);
			live = EMPTY;
			caret = 0;
		},
		get textarea() {
			return area ?? null;
		}
	};
	onMount(() => {
		ref = handle;
		return () => {
			ref = null;
		};
	});
	const height = new Spring(
		untrack(() => minRows * 24 + 22),
		{ ...m.physics.smooth, precision: 0.001 }
	);
	let measured = false;
	$effect(() => {
		const node = backdrop,
			minimum = minRows,
			maximum = maxRows,
			reduce = reduced;
		if (!node) return;
		const style = getComputedStyle(node),
			line = parseFloat(style.lineHeight) || 24,
			pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
		const fit = () => {
			const target = Math.min(
				line * Math.max(minimum, maximum) + pad,
				Math.max(line * minimum + pad, node.offsetHeight)
			);
			if (!measured || reduce || Math.abs(untrack(() => height.current) - target) > 0.5)
				void height.set(target, { instant: !measured || reduce });
			measured = true;
		};
		fit();
		const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
		observer?.observe(node);
		return () => observer?.disconnect();
	});
	let anchor = $state<{ x: number; y: number; line: number; above: boolean } | null>(null);
	function measureAnchor() {
		const marker = backdrop?.querySelector<HTMLElement>('[data-anchor]');
		if (!marker || !root || !field || !area) {
			anchor = null;
			return;
		}
		const line = parseFloat(getComputedStyle(marker.parentElement ?? marker).lineHeight) || 24;
		const x = Math.max(
			0,
			Math.min(field.offsetLeft + marker.offsetLeft - 10, root.offsetWidth - 272)
		);
		const top = field.offsetTop + marker.offsetTop - area.scrollTop;
		const box = root.getBoundingClientRect(),
			roomBelow = window.innerHeight - (box.top + top + line);
		const above =
			placement === 'top' || (placement === 'auto' && roomBelow < 300 && box.top + top > roomBelow);
		const y = above ? top - 6 : top + line + 6;
		if (
			!anchor ||
			anchor.x !== x ||
			anchor.y !== y ||
			anchor.above !== above ||
			anchor.line !== line
		)
			anchor = { x, y, line, above };
	}
	$effect(() => {
		void value.text;
		void trigger?.start;
		void placement;
		if (open && backdrop && root && field && area) untrack(measureAnchor);
	});
	const shown = $derived(open && !!anchor);
	const glide = { visualDuration: 0.3, bounce: 0.1 } as const;
	// Match the source physical glide and its distance-dependent settling threshold.
	const highlightSpring = new HighlightMotion(() => ({
		reduced,
		spec: glide,
		measure: 'offset'
	}));
	const panelHeight = new Spring(0, { ...m.physics.smooth, precision: 0.001 });
	let panelSized = false;
	$effect(() => {
		void suggestions;
		void activeIndex;
		if (!shown) {
			untrack(() => highlightSpring.move(null));
			return;
		}
		const row = list?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
		untrack(() => highlightSpring.move(row));
	});
	$effect(() => {
		void trigger?.start;
		if (!shown) {
			panelSized = false;
			return;
		}
		const node = body,
			reduce = reduced;
		if (!node) return;
		const fit = () => {
			void panelHeight.set(node.offsetHeight, { instant: !panelSized || reduce });
			panelSized = true;
		};
		fit();
		const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
		observer?.observe(node);
		return () => observer?.disconnect();
	});
	const mirror = $derived.by(() => {
		const parts: { text: string; kind?: MentionKind; anchor?: boolean }[] = [];
		const markAt = open && trigger ? trigger.start : -1;
		let at = 0;
		const push = (from: number, to: number) => {
			if (markAt >= from && markAt < to)
				parts.push(
					{ text: value.text.slice(from, markAt) },
					{ text: '', anchor: true },
					{ text: value.text.slice(markAt, to) }
				);
			else parts.push({ text: value.text.slice(from, to) });
		};
		for (const mention of value.mentions) {
			push(at, mention.start);
			parts.push({ text: value.text.slice(mention.start, mention.end), kind: mention.kind });
			at = mention.end;
		}
		push(at, value.text.length);
		return parts;
	});
	const optionId = (index: number) => `${uid}-option-${index}`;
	const countLabel = $derived(
		open
			? suggestions.length
				? `${suggestions.length} ${trigger?.kind === 'person' ? (suggestions.length === 1 ? 'person' : 'people') : suggestions.length === 1 ? 'channel' : 'channels'}`
				: 'No matches'
			: ''
	);
</script>

<div
	bind:this={root}
	class={['arc-mention-input__root', className]}
	data-disabled={disabled || undefined}
>
	<div
		bind:this={field}
		class="arc-mention-input__field"
		style:height={`${height.current}px`}
		data-focused={focused || undefined}
	>
		<div bind:this={backdrop} class="arc-mention-input__backdrop" aria-hidden="true">
			{#each mirror as part, index (index)}{#if part.anchor}<span data-anchor=""
					></span>{:else if part.kind}<span class="arc-mention-input__token" data-kind={part.kind}
						>{part.text}</span
					>{:else}{part.text}{/if}{/each}{'\u200b'}
		</div>
		<!-- The native textarea owns the source combobox's caret and atomic mention editing. -->
		<textarea
			bind:this={area}
			{id}
			{name}
			class="arc-mention-input__textarea"
			value={value.text}
			{placeholder}
			{disabled}
			rows={minRows}
			spellcheck="true"
			role="combobox"
			aria-label={ariaLabel}
			aria-describedby={describedBy}
			aria-autocomplete="list"
			aria-haspopup="listbox"
			aria-expanded={open}
			aria-controls={open ? listId : undefined}
			aria-activedescendant={open && suggestions.length ? optionId(activeIndex) : undefined}
			oninput={input}
			onselect={select}
			onkeydown={keydown}
			onscroll={(event) => {
				if (backdrop) backdrop.style.transform = `translateY(${-event.currentTarget.scrollTop}px)`;
				measureAnchor();
			}}
			onfocus={() => (focused = true)}
			onblur={() => {
				focused = false;
				caret = null;
			}}></textarea>
	</div>
	<span class="arc-mention-input__srOnly" aria-live="polite">{countLabel}</span>
	{#each shown && anchor ? [{ start: trigger?.start, anchor }] : [] as panel (panel.start)}
		<!-- svelte-ignore a11y_no_static_element_interactions (Preventing mouse down retains the native combobox caret.) -->
		<div
			class="arc-mention-input__popover"
			data-above={panel.anchor.above || undefined}
			style:left={`${panel.anchor.x}px`}
			style:top={`${panel.anchor.y}px`}
			style:height={`${panelHeight.current}px`}
			style:transform-origin={panel.anchor.above ? '14px 100%' : '14px 0'}
			in:swap={{
				scale: reduced ? 1 : 0.96,
				y: reduced ? 0 : panel.anchor.above ? 4 : -4,
				...(reduced ? { duration: m.duration.fast } : m.spring.snappy),
				fade: { duration: m.duration.fast, easing: reduced ? undefined : m.ease.enter }
			}}
			out:swap={{
				scale: reduced ? 1 : 0.96,
				y: reduced ? 0 : panel.anchor.above ? 4 : -4,
				duration: m.duration.exit * 0.7,
				easing: m.ease.standard
			}}
			onmousedown={(event) => event.preventDefault()}
		>
			<div bind:this={body} class="arc-mention-input__popoverBody">
				{#if suggestions.length}<ul
						bind:this={list}
						id={listId}
						role="listbox"
						aria-label={trigger?.kind === 'person' ? 'People' : 'Channels'}
						class="arc-mention-input__list"
					>
						<li
							aria-hidden="true"
							class="arc-mention-input__highlight"
							style={highlightSpring.style}
						></li>
						{#each suggestions as suggestion, index (`${suggestion.kind}-${suggestion.item.id}`)}
							<!-- svelte-ignore a11y_click_events_have_key_events (Keyboard navigation and selection remain on the textarea combobox.) -->
							<li
								id={optionId(index)}
								role="option"
								aria-selected={index === activeIndex}
								data-index={index}
								class="arc-mention-input__option"
								onpointermove={() => {
									if (index !== activeIndex) active = index;
								}}
								onclick={() => choose(suggestion)}
							>
								{#if suggestion.kind === 'person'}<span
										class="arc-mention-input__avatar"
										aria-hidden="true"
										>{#if suggestion.item.avatar}<img
												src={suggestion.item.avatar}
												alt=""
												width={28}
												height={28}
												loading="lazy"
											/>{:else}{initials(suggestion.item.name)}{/if}</span
									>{:else}<span class="arc-mention-input__glyph" aria-hidden="true"
										><Hash size={16} strokeWidth={1.75} /></span
									>{/if}
								<span class="arc-mention-input__optionText"
									><span class="arc-mention-input__optionLabel"
										><Highlight
											text={suggestion.item.name}
											query={trigger?.query.trim() ?? ''}
										/></span
									>{#if suggestion.kind === 'person'}{#if suggestion.item.role}<span
												class="arc-mention-input__optionMeta">{suggestion.item.role}</span
											>{/if}{:else if suggestion.item.description}<span
											class="arc-mention-input__optionMeta">{suggestion.item.description}</span
										>{/if}</span
								>
								{#if suggestion.kind === 'channel' && suggestion.item.members !== undefined}<span
										class="arc-mention-input__count">{suggestion.item.members}</span
									>{/if}
							</li>
						{/each}
					</ul>{:else}<p class="arc-mention-input__empty">
						No {trigger?.kind === 'person' ? 'people' : 'channels'} match “{trigger?.query}”
					</p>{/if}
			</div>
		</div>
	{/each}
</div>
