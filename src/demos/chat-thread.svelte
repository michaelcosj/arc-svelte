<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import { Mounted } from '#lib/motion';
	import { ChatThread, type ChatMessage, type ChatDraft } from '#arc/chat-thread';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
	const mounted = new Mounted();
	const participants = ['Jordan Reyes', 'Chloe Nguyen', 'Daniel Kim'].map((name) => ({
		id: name.split(' ')[0]!.toLowerCase(),
		name,
		avatar: `/media/people/${name.toLowerCase().replace(' ', '-')}.jpg`
	}));
	function date(days: number, h: number, m: number) {
		const d = new SvelteDate();
		d.setDate(d.getDate() - days);
		d.setHours(h, m, 0, 0);
		return d;
	}
	let messages = $state<ChatMessage[]>([
			{
				id: 'm1',
				authorId: 'chloe',
				createdAt: date(1, 16, 12),
				text: 'Hi! Our CSV export from the revenue dashboard stops at 10,000 rows. Is that a limit on our plan?'
			},
			{
				id: 'm2',
				authorId: 'jordan',
				createdAt: date(1, 16, 20),
				text: "Hi Chloe, thanks for flagging it. That isn't a plan limit. Looping in Daniel from our backend team.",
				status: 'read'
			},
			{
				id: 'm3',
				authorId: 'daniel',
				createdAt: date(1, 16, 41),
				text: 'Found it. The export job still used the old page size. A fix goes out tomorrow morning.'
			},
			{
				id: 'm4',
				authorId: 'daniel',
				createdAt: date(0, 9, 18),
				text: 'Fix is live. Exports now stream up to one million rows.',
				reactions: [{ emoji: '🎉', count: 2 }]
			},
			{
				id: 'm5',
				authorId: 'daniel',
				createdAt: date(0, 9, 19),
				attachments: [{ id: 'a1', kind: 'file', name: 'export-check-q3.csv', size: 2516582 }]
			},
			{
				id: 'm6',
				authorId: 'chloe',
				createdAt: date(0, 9, 31),
				text: 'All 48,210 rows came through. Thank you both!'
			},
			{
				id: 'm7',
				authorId: 'chloe',
				createdAt: date(0, 9, 32),
				text: "The view from our offsite, since it's finally a calm day",
				attachments: [
					{
						id: 'a2',
						kind: 'image',
						name: 'offsite.jpg',
						url: '/media/photos/sea-at-dusk.jpg',
						width: 2400,
						height: 1600,
						alt: 'A calm sea at dusk with a low island on the horizon'
					}
				],
				reactions: [{ emoji: '❤️', count: 1, mine: true }]
			},
			{
				id: 'm8',
				authorId: 'jordan',
				createdAt: date(0, 9, 34),
				text: "So glad it worked. I'll close this out, reply here anytime.",
				status: 'delivered'
			}
		]),
		readBy = $state<Record<string, string>>({ daniel: 'm8', chloe: 'm7' }),
		typing = $state<string[]>([]),
		offline = $state(false);
	let counter = 0,
		reply = 0;
	const timers: ReturnType<typeof setTimeout>[] = [],
		urls: string[] = [];
	const replies = [
		'Perfect, thank you. Should I expect the same for scheduled exports?',
		"Got it. I'll let the finance team know they can run the full quarter again.",
		'That makes sense. Appreciate the quick turnaround, really.',
		'Will do. Have a great rest of your week!'
	];
	function later(ms: number, fn: () => void) {
		timers.push(setTimeout(fn, ms));
	}
	function update(id: string, patch: Partial<ChatMessage>) {
		messages = messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
	}
	function retry(id: string) {
		update(id, { status: 'sending' });
		later(600, () => {
			if (offline) {
				update(id, { status: 'failed' });
				return;
			}
			update(id, { status: 'delivered' });
			later(1100, () => {
				readBy = { ...readBy, chloe: id, daniel: id };
				later(500, () => (typing = ['chloe']));
				later(2300, () => {
					typing = [];
					messages = [
						...messages,
						{
							id: `reply-${++counter}`,
							authorId: 'chloe',
							createdAt: new Date(),
							text: replies[reply++ % replies.length]
						}
					];
				});
			});
		});
	}
	function send({ text, files }: ChatDraft) {
		const id = `sent-${++counter}`,
			attachments = files.map((file, index) => {
				const url = URL.createObjectURL(file);
				urls.push(url);
				return {
					id: `${id}-${index}`,
					name: file.name,
					size: file.size,
					kind: file.type.startsWith('image/') ? ('image' as const) : ('file' as const),
					url
				};
			});
		messages = [
			...messages,
			{
				id,
				authorId: 'jordan',
				createdAt: new Date(),
				text: text || undefined,
				attachments,
				status: 'sending'
			}
		];
		retry(id);
	}
	function react(id: string, emoji: string) {
		messages = messages.map((m) => {
			if (m.id !== id) return m;
			const list = [...(m.reactions ?? [])],
				at = list.findIndex((r) => r.emoji === emoji);
			if (at < 0) list.push({ emoji, count: 1, mine: true });
			else {
				const found = list[at]!;
				list[at] = { ...found, count: found.count + (found.mine ? -1 : 1), mine: !found.mine };
			}
			return { ...m, reactions: list.filter((r) => r.count > 0) };
		});
	}
	onDestroy(() => {
		timers.forEach(clearTimeout);
		urls.forEach((url) => URL.revokeObjectURL(url));
	});
</script>

<div class="canvas">
	<div class="demo">
		<div class="card">
			<header>
				<span class="faces" aria-hidden="true"
					>{#each participants.slice(1) as person (person.id)}<img
							src={person.avatar}
							alt=""
							width="28"
							height="28"
						/>{/each}</span
				>
				<div class="heading">
					<h3>CSV export limit</h3>
					<p>Chloe Nguyen, Daniel Kim</p>
				</div>
				<button
					type="button"
					class="toggle"
					aria-label="Simulate offline"
					aria-pressed={offline}
					onclick={() => (offline = !offline)}
					><WifiOff size={15} strokeWidth={1.75} aria-hidden="true" /><span class="toggleLabels"
						><span data-active={!offline ? '' : undefined} aria-hidden={offline || undefined}
							>Go offline</span
						><span data-active={offline ? '' : undefined} aria-hidden={!offline || undefined}
							>Offline</span
						></span
					></button
				>
			</header>
			<div class="thread">
				{#if mounted.current}<ChatThread
						{participants}
						currentUserId="jordan"
						{messages}
						{readBy}
						{typing}
						onSend={send}
						onReact={react}
						onRetry={retry}
						placeholder="Reply to Chloe"
						label="Support conversation"
					/>{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 760px;
		margin-inline: auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.canvas > * {
		width: 100%;
		min-width: 0;
	}
	.demo {
		width: min(100%, 560px);
		margin-inline: auto;
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
		line-height: var(--leading-body);
	}
	.card {
		display: flex;
		height: min(436px, 80vh);
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-surface);
		background: var(--surface);
		box-shadow: var(--shadow-resting);
	}
	header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px 12px 18px;
		border-bottom: 1px solid var(--border-subtle);
	}
	.faces {
		display: inline-flex;
		flex: none;
	}
	.faces img {
		border-radius: 50%;
		object-fit: cover;
		box-shadow: 0 0 0 2px var(--surface);
	}
	.faces img + img {
		margin-left: -8px;
	}
	.heading {
		display: grid;
		min-width: 0;
		flex: 1;
	}
	h3 {
		font-size: var(--text-sm);
		font-weight: 500;
	}
	h3,
	p {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	p {
		color: var(--text-muted);
		font-size: var(--text-xs);
	}
	.toggle {
		display: inline-flex;
		height: 32px;
		flex: none;
		align-items: center;
		gap: 6px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text-secondary);
		cursor: pointer;
		font: inherit;
		font-size: var(--text-xs);
		font-weight: 500;
		-webkit-tap-highlight-color: transparent;
		transition:
			background-color var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard);
	}
	.toggle[aria-pressed='true'] {
		border-color: var(--border-strong);
		background: var(--surface-muted);
		color: var(--foreground);
	}
	.toggle:hover {
		color: var(--foreground);
	}
	.toggleLabels {
		display: inline-grid;
		justify-items: center;
	}
	.toggleLabels > span {
		grid-area: 1/1;
		visibility: hidden;
		opacity: 0;
		transition: opacity var(--duration-fast) var(--ease-standard);
		white-space: nowrap;
	}
	.toggleLabels > span[data-active] {
		visibility: visible;
		opacity: 1;
	}
	.thread {
		min-height: 0;
		flex: 1;
	}
	@media (max-width: 480px) {
		header {
			padding-left: 14px;
		}
		.toggle .toggleLabels {
			display: none;
		}
		.toggle {
			width: 32px;
			justify-content: center;
			padding: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.toggleLabels > span {
			transition: none;
		}
	}
</style>
