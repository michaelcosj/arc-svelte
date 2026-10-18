<script lang="ts">
	import { tick } from 'svelte';
	import Archive from '@lucide/svelte/icons/archive';
	import Clock from '@lucide/svelte/icons/clock-3';
	import Trash from '@lucide/svelte/icons/trash-2';
	import Undo from '@lucide/svelte/icons/undo-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, swap, motionTokens as m } from '#lib/motion';
	import { SwipeActions, SwipeActionsRow } from '#arc/swipe-actions';
	import './swipe-actions-demo.css';
	const initial = [
		{
			id: 'atlas',
			sender: 'Emma Collins',
			avatar: 'emma-collins',
			subject: 'Atlas launch checklist',
			preview: 'QA signed off. Two billing blockers left before Thursday.',
			time: '9:41'
		},
		{
			id: 'invoice',
			sender: 'Marcus Johnson',
			avatar: 'marcus-johnson',
			subject: 'Invoice INV-2048 from Northwind',
			preview: '$4,280.00 is due on October 3. The PDF is attached.',
			time: '8:15'
		},
		{
			id: 'readout',
			sender: 'Ava Mitchell',
			avatar: 'ava-mitchell',
			subject: 'Research readout moved to Friday',
			preview: 'Room 4B, 2:00 to 3:30. Interview clips are in the deck.',
			time: 'Yesterday'
		},
		{
			id: 'crit',
			sender: 'Sofia Ramirez',
			avatar: 'sofia-ramirez',
			subject: 'Design crit notes',
			preview: 'Navigation feedback, with an owner for each follow-up.',
			time: 'Mon'
		}
	];
	let messages = $state(initial),
		text = $state('Swipe a message, or use its menu.'),
		seq = $state(0);
	let undo = $state<{ message: (typeof initial)[number]; index: number } | null>(null);
	let root: HTMLDivElement;
	const mounted = new Mounted(),
		reduced = $derived(prefersReducedMotion.current);
	function remove(message: (typeof initial)[number], result: string) {
		undo = { message, index: messages.indexOf(message) };
		messages = messages.filter((m) => m.id !== message.id);
		text = result;
		seq++;
	}
	async function focus(subject: string) {
		await tick();
		root.querySelector<HTMLButtonElement>(`[aria-label="More actions for ${subject}"]`)?.focus();
	}
	function restore() {
		if (!undo) return;
		const { message, index } = undo;
		messages = [...messages.slice(0, index), message, ...messages.slice(index)];
		undo = null;
		text = `Restored “${message.subject}”`;
		seq++;
		void focus(message.subject);
	}
</script>

{#snippet archive()}<Archive strokeWidth={1.75} />{/snippet}
{#snippet snooze()}<Clock strokeWidth={1.75} />{/snippet}
{#snippet trash()}<Trash strokeWidth={1.75} />{/snippet}
<div bind:this={root} class="arc-swipe-actions-demo__demo">
	<div class="arc-swipe-actions-demo__header">
		<h3 class="arc-swipe-actions-demo__title">Inbox</h3>
		<p class="arc-swipe-actions-demo__count">
			<span class="arc-swipe-actions-demo__rolling" aria-hidden="true"
				>{#key messages.length}<span
						class="arc-swipe-actions-demo__rollingDigit"
						in:swap={{
							skip: !mounted.current,
							y: reduced ? 0 : '-.55em',
							blur: reduced ? 0 : 2,
							...m.spring.snappy
						}}
						out:swap={{ y: reduced ? 0 : '.55em', duration: 120, pop: true }}
						>{messages.length}</span
					>{/key}</span
			><span aria-hidden="true">left to triage</span><span class="arc-swipe-actions-demo__srOnly"
				>{messages.length} left to triage</span
			>
		</p>
	</div>
	<div class="arc-swipe-actions-demo__stage">
		<SwipeActions label="Inbox" class="arc-swipe-actions-demo__list">
			{#each messages as message (message.id)}
				<SwipeActionsRow
					label={message.subject}
					leading={[
						{
							label: 'Archive',
							icon: archive,
							tone: 'accent',
							onSelect: () => remove(message, `Archived “${message.subject}”`)
						}
					]}
					trailing={[
						{
							label: 'Snooze',
							icon: snooze,
							onSelect: () => remove(message, `Snoozed “${message.subject}” until tomorrow, 9:00`)
						},
						{
							label: 'Delete',
							icon: trash,
							tone: 'danger',
							onSelect: () => remove(message, `Deleted “${message.subject}”`)
						}
					]}
				>
					<div class="arc-swipe-actions-demo__message">
						<img
							class="arc-swipe-actions-demo__avatar"
							src="/media/people/{message.avatar}.jpg"
							alt=""
							width="40"
							height="40"
							draggable="false"
						/>
						<div class="arc-swipe-actions-demo__copy">
							<span class="arc-swipe-actions-demo__topline"
								><span class="arc-swipe-actions-demo__sender">{message.sender}</span><span
									class="arc-swipe-actions-demo__time">{message.time}</span
								></span
							><span class="arc-swipe-actions-demo__subject">{message.subject}</span><span
								class="arc-swipe-actions-demo__preview">{message.preview}</span
							>
						</div>
					</div>
				</SwipeActionsRow>
			{/each}
		</SwipeActions>
		{#if !messages.length}<div
				class="arc-swipe-actions-demo__empty"
				in:swap={{
					y: reduced ? 0 : 8,
					blur: reduced ? 0 : 4,
					duration: reduced ? 150 : 480,
					delay: reduced ? 0 : 500,
					easing: m.ease.enter
				}}
				out:swap={{ duration: 120 }}
			>
				<p class="arc-swipe-actions-demo__emptyTitle">Inbox zero</p>
				<p class="arc-swipe-actions-demo__emptyText">
					Every message is archived, snoozed, or deleted.
				</p>
				<button
					type="button"
					class="arc-swipe-actions-demo__button"
					onclick={() => {
						messages = initial;
						undo = null;
						text = 'Restored 4 messages';
						seq++;
						void focus(initial[0].subject);
					}}><RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />Restore messages</button
				>
			</div>{/if}
	</div>
	<div class="arc-swipe-actions-demo__footer">
		<span class="arc-swipe-actions-demo__rise" aria-hidden="true"
			>{#key seq}<span
					class="arc-swipe-actions-demo__riseLine"
					in:swap={{
						skip: !mounted.current,
						y: reduced ? 0 : '.3em',
						blur: reduced ? 0 : 4,
						duration: reduced ? 150 : 220,
						easing: m.ease.enter
					}}
					out:swap={{
						y: reduced ? 0 : '-.3em',
						blur: reduced ? 0 : 2,
						duration: reduced ? 100 : 150,
						pop: true
					}}>{text}</span
				>{/key}</span
		>{#if undo}<button
				type="button"
				class="arc-swipe-actions-demo__button"
				onclick={restore}
				in:swap={{ scale: reduced ? 1 : 0.9, blur: reduced ? 0 : 2, ...m.spring.snappy }}
				out:swap={{ duration: 120 }}
				><Undo size={16} strokeWidth={1.75} aria-hidden="true" />Undo</button
			>{/if}<span class="arc-swipe-actions-demo__srOnly" role="status">{seq ? text : ''}</span>
	</div>
</div>
