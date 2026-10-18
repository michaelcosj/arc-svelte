<script lang="ts">
	import { MentionInput, type MentionInputHandle, type MentionValue } from '#arc/mention-input';
	import { people as mediaPeople } from '#lib/media.ts';
	import { Mounted, swap, motionTokens as m } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	import AtSign from '@lucide/svelte/icons/at-sign';
	import Hash from '@lucide/svelte/icons/hash';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import './demo.css';
	import './mention-input-demo.css';
	let ref = $state<MentionInputHandle | null>(null);
	let value = $state<MentionValue>({ text: '', mentions: [] });
	let posted = $state<{ id: number; text: string } | null>(null);
	const people = mediaPeople
		.filter((person) => person.id !== 'nathan-cole')
		.map((person) => ({ id: person.id, name: person.name, role: person.role, avatar: person.src }));
	const channels = [
		{ id: 'launch', name: 'launch', description: 'Dates, owners, and the checklist', members: 32 },
		{ id: 'design-crit', name: 'design-crit', description: 'Thursday critique', members: 14 },
		{ id: 'frontend', name: 'frontend', description: 'Web app and design system', members: 21 },
		{
			id: 'support-escalations',
			name: 'support-escalations',
			description: 'Tickets that need an engineer',
			members: 9
		},
		{ id: 'general', name: 'general', description: 'Company wide', members: 118 }
	];
	const count = $derived(
		new Set(
			value.mentions.filter((mention) => mention.kind === 'person').map((mention) => mention.id)
		).size
	);
	const ready = $derived(value.text.trim().length > 0);
	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const join = (names: string[]) =>
		names.length <= 2
			? names.join(' and ')
			: `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
	function submit(next: MentionValue) {
		if (!next.text.trim()) return;
		const names = [
			...new Set(
				next.mentions
					.filter((mention) => mention.kind === 'person')
					.map((mention) => mention.label.split(' ')[0]!)
			)
		];
		const rooms = [
			...new Set(
				next.mentions
					.filter((mention) => mention.kind === 'channel')
					.map((mention) => `#${mention.label}`)
			)
		];
		posted = {
			id: Date.now(),
			text: [
				'Posted',
				names.length && `notified ${join(names)}`,
				rooms.length && `shared to ${join(rooms)}`
			]
				.filter(Boolean)
				.join(' · ')
		};
		ref?.clear();
		ref?.focus();
	}
</script>

<div class="demo-canvas">
	<div class="demo-mention-input__demo">
		<div class="demo-mention-input__composer">
			<MentionInput
				bind:ref
				{value}
				onChange={(next) => {
					value = next;
					if (next.text) posted = null;
				}}
				{people}
				{channels}
				onSubmit={submit}
				submitOnEnter
				maxRows={5}
				placement="bottom"
				aria-label="Write an update"
				placeholder="Share an update, @ to mention"
			/>
			<div class="demo-mention-input__bar">
				<button
					type="button"
					class="demo-mention-input__tool"
					onmousedown={(event) => event.preventDefault()}
					aria-label="Mention someone"
					onclick={() => ref?.openSuggestions('person')}
					><AtSign size={18} strokeWidth={1.75} aria-hidden="true" /></button
				>
				<button
					type="button"
					class="demo-mention-input__tool"
					onmousedown={(event) => event.preventDefault()}
					aria-label="Add a channel"
					onclick={() => ref?.openSuggestions('channel')}
					><Hash size={18} strokeWidth={1.75} aria-hidden="true" /></button
				>
				<p class="demo-mention-input__notify" aria-live="polite">
					{#key count}<span
							class="demo-mention-input__notifyText"
							in:swap={{ y: reduced ? 0 : 6, ...m.spring.snappy, skip: !mounted.current }}
							out:swap={{ y: reduced ? 0 : -6, ...m.spring.snappy, pop: true }}
							>{count
								? `Notifies ${count} ${count === 1 ? 'person' : 'people'}`
								: 'Enter to post'}</span
						>{/key}
				</p>
				<button
					type="button"
					class="demo-mention-input__send"
					data-ready={ready || undefined}
					disabled={!ready}
					onclick={() => submit(value)}
					><span>Post</span><ArrowUp size={16} strokeWidth={2} aria-hidden="true" /></button
				>
			</div>
		</div>
		<p class="demo-mention-input__status" role="status">
			{#each posted ? [posted] : [] as message (message.id)}<span
					class="demo-mention-input__statusText"
					in:swap={{ y: reduced ? 0 : 6, ...m.spring.smooth }}
					out:swap={{ duration: m.duration.exit, pop: true }}>{message.text}</span
				>{/each}
		</p>
	</div>
</div>
