<script lang="ts">
	import { Combobox } from 'bits-ui';
	import { tick, untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { heightPresence } from '#lib/motion';
	import ThreadAvatar from './ThreadAvatar.svelte';
	import type { CommentAuthor } from './types';
	let {
		people,
		initial = '',
		placeholder,
		submitLabel,
		autoFocus = false,
		focusKey = 0,
		onSubmit,
		onCancel,
		leading,
		compact = false,
		cancelLabel,
		mentionsLabel
	}: {
		people: CommentAuthor[];
		initial?: string;
		placeholder: string;
		submitLabel: string;
		autoFocus?: boolean;
		focusKey?: number;
		onSubmit: (body: string) => void;
		onCancel?: () => void;
		leading?: Snippet;
		compact?: boolean;
		cancelLabel: string;
		mentionsLabel: string;
	} = $props();
	const uid = $props.id(),
		reduced = $derived(Boolean(prefersReducedMotion.current));
	let field = $state<HTMLTextAreaElement>(),
		text = $state(untrack(() => initial)),
		query = $state<{ start: number; term: string } | null>(null),
		active = $state(0);
	const suggestions = $derived(
			query
				? people
						.filter(
							(p) =>
								p.name
									.toLowerCase()
									.split(' ')
									.some((part) => part.startsWith(query!.term.toLowerCase())) ||
								p.name.toLowerCase().startsWith(query!.term.toLowerCase())
						)
						.slice(0, 5)
				: []
		),
		open = $derived(Boolean(query) && suggestions.length > 0);
	$effect(() => {
		const focus = autoFocus || focusKey > 0;
		untrack(() => {
			if (focus && field) {
				field.focus({ preventScroll: true });
				field.setSelectionRange(field.value.length, field.value.length);
			}
		});
	});
	function readQuery(value: string, caret: number) {
		const match = /(^|\s)@([\p{L}]*)$/u.exec(value.slice(0, caret));
		query = match ? { start: caret - match[2]!.length - 1, term: match[2]! } : null;
		active = 0;
	}
	async function insert(person: CommentAuthor) {
		if (!field || !query) return;
		const caret = field.selectionStart ?? text.length,
			at = query.start + person.name.length + 2;
		text = `${text.slice(0, query.start)}@${person.name} ${text.slice(caret)}`;
		query = null;
		await tick();
		field.focus();
		field.setSelectionRange(at, at);
	}
	function send() {
		const body = text.trim();
		if (!body) return;
		onSubmit(body);
		text = '';
		query = null;
	}
	function key(e: KeyboardEvent) {
		if (open) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				active =
					(active + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
				return;
			}
			if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				void insert(suggestions[active]!);
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				query = null;
				return;
			}
		}
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			send();
			return;
		}
		if (e.key === 'Escape' && onCancel) {
			e.preventDefault();
			e.stopPropagation();
			onCancel();
		}
	}
</script>

<div class="arc-comment-thread__composer" data-compact={compact || undefined}>
	{@render leading?.()}
	<div class="arc-comment-thread__field-wrap">
		<Combobox.Root
			type="single"
			value=""
			{open}
			onOpenChange={(next) => {
				if (!next) query = null;
			}}
			onValueChange={(id) => {
				const person = people.find((p) => p.id === id);
				if (person) void insert(person);
			}}
			inputValue=""
			loop
		>
			<Combobox.Input
				>{#snippet child({ props })}<textarea
						{...props}
						bind:this={field}
						class="arc-comment-thread__field"
						value={text}
						{placeholder}
						rows="1"
						aria-label={placeholder}
						role="combobox"
						aria-autocomplete="list"
						aria-expanded={open}
						aria-controls={`${uid}-people`}
						aria-activedescendant={open ? `${uid}-person-${active}` : undefined}
						oninput={(e) => {
							text = e.currentTarget.value;
							readQuery(text, e.currentTarget.selectionStart);
						}}
						onselect={(e) => readQuery(e.currentTarget.value, e.currentTarget.selectionStart)}
						onblur={() => (query = null)}
						onkeydown={key}></textarea>{/snippet}</Combobox.Input
			>
			<Combobox.ContentStatic forceMount onInteractOutside={() => (query = null)}
				>{#snippet child({ props })}{#if open}<ul
							{...props}
							id={`${uid}-people`}
							role="listbox"
							aria-label={mentionsLabel}
							class="arc-comment-thread__suggestions"
							in:heightPresence={{ reduced }}
							out:heightPresence={{ reduced }}
						>
							{#each suggestions as person, index (person.id)}<Combobox.Item
									value={person.id}
									label={person.name}
									onHighlight={() => (active = index)}
									>{#snippet child({ props: itemProps })}<li
											{...itemProps}
											id={`${uid}-person-${index}`}
											role="option"
											aria-selected={index === active}
											class="arc-comment-thread__suggestion"
											onpointerdown={(e) => e.preventDefault()}
											onpointermove={() => (active = index)}
											onclick={() => insert(person)}
										>
											<ThreadAvatar author={person} size={20} />{person.name}
										</li>{/snippet}</Combobox.Item
								>{/each}
						</ul>{/if}{/snippet}</Combobox.ContentStatic
			>
		</Combobox.Root>
	</div>
	<div class="arc-comment-thread__composer-actions">
		{#if onCancel}<button type="button" class="arc-comment-thread__ghost" onclick={onCancel}
				>{cancelLabel}</button
			>{/if}<button
			type="button"
			class="arc-comment-thread__send"
			disabled={!text.trim() || text.trim() === initial.trim()}
			onclick={send}>{submitLabel}</button
		>
	</div>
</div>
