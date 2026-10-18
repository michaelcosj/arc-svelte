<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, motionTokens as m, heightPresence, swap } from '#lib/motion';
	import { usePlatform, usePressedKeys } from './shortcut-state.svelte';
	import { shortcutTokens } from './shortcut';
	import ShortcutKeys from './ShortcutKeys.svelte';
	import type { ShortcutListProps } from './types';
	import './shortcut-recorder.css';
	let {
		groups,
		label = 'Keyboard shortcuts',
		searchable = true,
		searchPlaceholder = 'Search shortcuts',
		highlightPressed = true,
		platform: override,
		class: className
	}: ShortcutListProps = $props();
	const detected = usePlatform(),
		platform = $derived(override ?? detected.current),
		held = usePressedKeys(() => highlightPressed),
		mounted = new Mounted(),
		reduced = $derived(Boolean(prefersReducedMotion.current));
	let query = $state(''),
		input = $state<HTMLInputElement>();
	const heldMods = $derived([...held].filter((k) => ['meta', 'ctrl', 'alt', 'shift'].includes(k))),
		words = $derived(
			query
				.trim()
				.toLowerCase()
				.replace(/⌘/g, ' cmd ')
				.replace(/⇧/g, ' shift ')
				.replace(/⌥/g, ' alt ')
				.replace(/⌃/g, ' ctrl ')
				.split(/[\s+]+/)
				.filter(Boolean)
		);
	const filtered = $derived.by(() => {
		const aliases: Record<string, string> = {
			cmd: 'command',
			command: 'command',
			ctrl: 'control',
			control: 'control',
			opt: 'option',
			option: platform === 'mac' ? 'option' : 'alt',
			alt: platform === 'mac' ? 'option' : 'alt',
			win: 'windows',
			esc: 'escape',
			return: platform === 'mac' ? 'return' : 'enter'
		};
		return groups
			.map((g) => ({
				...g,
				items: g.items.filter((item) => {
					const tokens = shortcutTokens(item.shortcut, platform),
						haystack =
							`${item.label} ${g.label} ${item.keywords ?? ''} ${tokens.map((t) => `${t.spoken} ${t.label}`).join(' ')}`.toLowerCase();
					return words.every((w) => haystack.includes(aliases[w] ?? w) || haystack.includes(w));
				})
			}))
			.filter((g) => g.items.length);
	});
	const total = $derived(filtered.reduce((n, g) => n + g.items.length, 0));
</script>

<section class={['arc-shortcut-recorder__list', className]} aria-label={label}>
	{#if searchable}<div class="arc-shortcut-recorder__search-row">
			<Search
				class="arc-shortcut-recorder__search-icon"
				size={16}
				strokeWidth={1.75}
				aria-hidden="true"
			/><input
				bind:this={input}
				class="arc-shortcut-recorder__search"
				type="search"
				placeholder={searchPlaceholder}
				bind:value={query}
				aria-label={searchPlaceholder}
				onkeydown={(e) => {
					if (e.key === 'Escape' && query) {
						e.preventDefault();
						query = '';
					}
				}}
				autocomplete="off"
				spellcheck={false}
			/><span class="arc-shortcut-recorder__count" aria-live="polite"
				>{query ? `${total} ${total === 1 ? 'match' : 'matches'}` : ''}</span
			>{#each query ? ['clear'] : [] as key (key)}<button
					class="arc-shortcut-recorder__clear"
					type="button"
					aria-label="Clear search"
					onclick={() => {
						query = '';
						input?.focus();
					}}
					in:swap={{ scale: 0.6, ...m.spring.snappy, skip: reduced || !mounted.current }}
					out:swap={{ scale: 0.6, duration: reduced ? 0 : 100 }}
					><X size={14} strokeWidth={1.75} aria-hidden="true" /></button
				>{/each}
		</div>{/if}
	<div class="arc-shortcut-recorder__groups">
		{#each filtered as group (group.label)}<section
				class="arc-shortcut-recorder__group"
				aria-label={group.label}
				in:heightPresence={{ skip: reduced || !mounted.current }}
				out:heightPresence={{ skip: reduced }}
			>
				<h4 class="arc-shortcut-recorder__group-label">{group.label}</h4>
				<ul class="arc-shortcut-recorder__rows">
					{#each group.items as item (item.label)}{@const ids = shortcutTokens(
							item.shortcut,
							platform
						).map((t) => t.id)}{@const match =
							held.size > 0 && ids.every((k) => held.has(k))}{@const dim =
							heldMods.length > 0 && !match && !heldMods.every((k) => ids.includes(k))}
						<li
							class="arc-shortcut-recorder__item"
							data-match={match || undefined}
							data-dim={dim || undefined}
							in:heightPresence={{ skip: reduced || !mounted.current }}
							out:heightPresence={{ skip: reduced }}
						>
							<span class="arc-shortcut-recorder__item-inner"
								><span class="arc-shortcut-recorder__item-label">{item.label}</span><ShortcutKeys
									shortcut={item.shortcut}
									{platform}
									pressed={held}
									size="sm"
								/></span
							>
						</li>{/each}
				</ul>
			</section>{/each}{#if !total}<p class="arc-shortcut-recorder__empty">
				No shortcuts match “{query.trim()}”
			</p>{/if}
	</div>
</section>
