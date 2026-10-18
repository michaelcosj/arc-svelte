<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { flip } from 'svelte/animate';
	import { Mounted, motionTokens as m, heightPresence, swap } from '#lib/motion';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CornerDownRight from '@lucide/svelte/icons/corner-down-right';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import SmilePlus from '@lucide/svelte/icons/smile-plus';
	import X from '@lucide/svelte/icons/x';
	import ThreadAvatar from './ThreadAvatar.svelte';
	import ThreadBody from './ThreadBody.svelte';
	import ThreadCount from './ThreadCount.svelte';
	import ThreadHeight from './ThreadHeight.svelte';
	import CommentComposer from './CommentComposer.svelte';
	import {
		DEFAULT_LABELS,
		withDefaults,
		mapTree,
		countTree,
		authorsOf,
		pathTo,
		find
	} from './thread';
	import type { CommentThreadProps, ThreadComment, CommentThreadEvent } from './types';
	import './comment-thread.css';
	let {
		comments = $bindable(undefined),
		defaultComments = [],
		onCommentsChange,
		currentUser,
		people,
		resolved = $bindable(undefined),
		defaultResolved = false,
		onResolvedChange,
		title,
		reactions = ['👍', '❤️', '🎉', '👀', '🚀', '✅'],
		placeholder = 'Reply, or @mention someone',
		maxDepth = 2,
		nowLabel = 'Just now',
		labels,
		class: className,
		ref = $bindable(null)
	}: CommentThreadProps = $props();
	let internal = $state(untrack(() => defaultComments)),
		internalResolved = $state(untrack(() => defaultResolved)),
		ui = $state<{
			editing: string | null;
			confirming: string | null;
			picker: string | null;
			collapsed: Record<string, boolean>;
		}>({ editing: null, confirming: null, picker: null, collapsed: {} }),
		replyTo = $state<{ id: string; name: string } | null>(null),
		focusKey = $state(0),
		serial = 0;
	const t = $derived(withDefaults(DEFAULT_LABELS, labels)),
		list = $derived(comments ?? internal),
		isResolved = $derived(resolved ?? internalResolved),
		total = $derived(countTree(list)),
		participants = $derived([...authorsOf(list).values()]),
		mentionable = $derived(
			people ?? [...authorsOf(list, new Map([[currentUser.id, currentUser]])).values()]
		),
		mounted = new Mounted(),
		reduced = $derived(mounted.current && Boolean(prefersReducedMotion.current));
	function commit(next: ThreadComment[], event: CommentThreadEvent) {
		if (comments === undefined) internal = next;
		else if (!onCommentsChange) comments = next;
		onCommentsChange?.(next, event);
	}
	async function setResolved(next: boolean) {
		if (resolved === undefined) internalResolved = next;
		else if (!onResolvedChange) resolved = next;
		onResolvedChange?.(next);
		ui.editing = null;
		ui.confirming = null;
		ui.picker = null;
		replyTo = null;
		await tick();
		ref
			?.querySelector<HTMLElement>(next ? '[data-reopen]' : '[data-resolve]')
			?.focus({ preventScroll: true });
	}
	function addReply(body: string) {
		const comment: ThreadComment = {
			id: `c-${Date.now().toString(36)}-${serial++}`,
			author: currentUser,
			body,
			createdAt: nowLabel,
			reactions: []
		};
		let parentId: string | null = null;
		if (replyTo) {
			const path = pathTo(list, replyTo.id) ?? [];
			parentId = path[Math.min(path.length, maxDepth) - 1] ?? null;
		}
		const next = parentId
			? mapTree(list, parentId, (p) => ({ ...p, replies: [...(p.replies ?? []), comment] }))
			: [...list, comment];
		if (parentId) ui.collapsed[parentId] = false;
		commit(next, { type: 'reply', comment, parentId });
		replyTo = null;
	}
	function edit(id: string, body: string) {
		commit(
			mapTree(list, id, (c) => ({ ...c, body, edited: true })),
			{ type: 'edit', id, body }
		);
		ui.editing = null;
	}
	function remove(id: string) {
		commit(
			mapTree(list, id, (c) =>
				c.replies?.length ? { ...c, deleted: true, body: '', reactions: [] } : null
			),
			{ type: 'delete', id }
		);
		ui.confirming = null;
		if (replyTo?.id === id) replyTo = null;
	}
	function react(id: string, emoji: string) {
		const target = find(list, id);
		if (!target) return;
		const existing = target.reactions?.find((r) => r.emoji === emoji),
			added = !existing?.users.includes(currentUser.id),
			nextReactions = existing
				? (target.reactions ?? [])
						.map((r) =>
							r.emoji !== emoji
								? r
								: {
										...r,
										users: added
											? [...r.users, currentUser.id]
											: r.users.filter((u) => u !== currentUser.id)
									}
						)
						.filter((r) => r.users.length)
				: [...(target.reactions ?? []), { emoji, users: [currentUser.id] }];
		commit(
			mapTree(list, id, (c) => ({ ...c, reactions: nextReactions })),
			{ type: 'react', id, emoji, added }
		);
		ui.picker = null;
	}
	function focus(node: HTMLElement) {
		node.focus({ preventScroll: true });
	}
	function escape(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			ui.confirming = null;
			ui.picker = null;
		}
	}
</script>

{#snippet subject()}{#if typeof title === 'string'}{title}{:else}{@render title?.()}{/if}{/snippet}
{#snippet renderComment(comment: ThreadComment, depth: number)}
	{@const mine = comment.author.id === currentUser.id}{@const replies =
		comment.replies ?? []}{@const collapsed = Boolean(ui.collapsed[comment.id])}{@const editing =
		ui.editing === comment.id}{@const confirming = ui.confirming === comment.id}{@const picking =
		ui.picker === comment.id}
	<li
		class="arc-comment-thread__item"
		in:heightPresence={{ skip: !mounted.current, reduced }}
		out:heightPresence={{ reduced }}
	>
		<article
			class="arc-comment-thread__comment"
			aria-label={comment.deleted
				? t.deletedComment
				: `${comment.author.name}, ${comment.createdAt}`}
		>
			{#if comment.deleted}<span class="arc-comment-thread__deleted-dot" aria-hidden="true"
				></span>{:else}<ThreadAvatar author={comment.author} />{/if}
			<div class="arc-comment-thread__main">
				{#if comment.deleted}<p class="arc-comment-thread__deleted">
						{t.deletedText}
					</p>{:else}<header class="arc-comment-thread__meta">
						<span class="arc-comment-thread__name">{comment.author.name}</span><span
							class="arc-comment-thread__time"
							>{comment.createdAt}{comment.edited ? ` · ${t.edited}` : ''}</span
						>
					</header>
					<ThreadHeight
						{reduced}
						morphKey={editing ? 'edit' : confirming ? 'confirm' : picking ? 'picker' : 'view'}
					>
						{#key editing}<div
								in:swap={{
									duration: reduced ? 0 : 160,
									easing: m.ease.enter,
									skip: !mounted.current
								}}
								out:swap={{ duration: reduced ? 0 : 120, easing: m.ease.standard, pop: true }}
							>
								{#if editing}<CommentComposer
										people={mentionable}
										initial={comment.body}
										placeholder={t.editComment}
										submitLabel={t.save}
										cancelLabel={t.cancel}
										mentionsLabel={t.mentions}
										autoFocus
										compact
										onSubmit={(body) => edit(comment.id, body)}
										onCancel={() => (ui.editing = null)}
									/>{:else}<ThreadBody text={comment.body} people={mentionable} />
									<div class="arc-comment-thread__footer">
										{#if comment.reactions?.length}<div
												class="arc-comment-thread__reactions"
												style="position:relative"
											>
												{#each comment.reactions as reaction (reaction.emoji)}{@const pressed =
														reaction.users.includes(currentUser.id)}<button
														type="button"
														class="arc-comment-thread__reaction"
														aria-pressed={pressed}
														aria-label={t.reactionCount(
															reaction.emoji,
															reaction.users.length,
															pressed
														)}
														onclick={() => react(comment.id, reaction.emoji)}
														animate:flip={{ ...(reduced ? { duration: 0 } : m.spring.snappy) }}
														in:swap={{
															scale: 0.7,
															...m.spring.snappy,
															skip: reduced || !mounted.current
														}}
														out:swap={{ scale: 0.7, ...m.spring.snappy, pop: true, skip: reduced }}
														><span aria-hidden="true">{reaction.emoji}</span><ThreadCount
															value={reaction.users.length}
															{reduced}
														/></button
													>{/each}
											</div>{/if}
										{#key confirming ? 'confirm' : picking ? 'picker' : 'actions'}<div
												class="arc-comment-thread__actions"
												style="opacity:1"
												data-open={confirming || picking ? '' : undefined}
												role={picking ? 'group' : undefined}
												aria-label={picking ? t.reactions : undefined}
												in:swap={{
													x: reduced ? 0 : confirming ? 6 : picking ? -6 : 0,
													duration: reduced ? 0 : 160,
													easing: m.ease.enter,
													skip: !mounted.current
												}}
												out:swap={{ duration: reduced ? 0 : 120, easing: m.ease.standard }}
											>
												{#if confirming}<span class="arc-comment-thread__prompt"
														>{t.deleteConfirm}</span
													><button
														type="button"
														class="arc-comment-thread__action"
														onclick={() => (ui.confirming = null)}
														onkeydown={escape}>{t.cancel}</button
													><button
														type="button"
														class="arc-comment-thread__action"
														data-tone="danger"
														onclick={() => remove(comment.id)}
														onkeydown={escape}
														{@attach focus}>{t.delete}</button
													>
												{:else if picking}{#each reactions as emoji, index (emoji)}<button
															type="button"
															class="arc-comment-thread__emoji"
															aria-label={t.reactWith(emoji)}
															aria-pressed={Boolean(
																comment.reactions
																	?.find((r) => r.emoji === emoji)
																	?.users.includes(currentUser.id)
															)}
															onclick={() => react(comment.id, emoji)}
															onkeydown={escape}
															{@attach index === 0 ? focus : undefined}
															in:swap={{
																scale: 0.6,
																...m.spring.snappy,
																delay: index * m.stagger.item,
																skip: reduced
															}}>{emoji}</button
														>{/each}<button
														type="button"
														class="arc-comment-thread__icon-action"
														aria-label={t.closeReactions}
														onclick={() => (ui.picker = null)}
														onkeydown={escape}><X size={14} strokeWidth={1.75} /></button
													>
												{:else}<button
														type="button"
														class="arc-comment-thread__icon-action"
														aria-label={t.addReaction}
														onclick={() => {
															ui.picker = comment.id;
															ui.confirming = null;
														}}><SmilePlus size={15} strokeWidth={1.75} /></button
													><button
														type="button"
														class="arc-comment-thread__action"
														onclick={() => {
															replyTo = { id: comment.id, name: comment.author.name };
															focusKey++;
														}}>{t.reply}</button
													>{#if mine}<button
															type="button"
															class="arc-comment-thread__action"
															onclick={() => {
																ui.editing = comment.id;
																ui.confirming = null;
																ui.picker = null;
															}}>{t.edit}</button
														><button
															type="button"
															class="arc-comment-thread__action"
															onclick={() => {
																ui.confirming = comment.id;
																ui.editing = null;
																ui.picker = null;
															}}>{t.delete}</button
														>{/if}{/if}
											</div>{/key}
									</div>{/if}
							</div>{/key}</ThreadHeight
					>{/if}
				{#if replies.length}<button
						type="button"
						class="arc-comment-thread__toggle"
						aria-expanded={!collapsed}
						onclick={() => (ui.collapsed[comment.id] = !collapsed)}
						><span
							class="arc-comment-thread__toggle-icon"
							style:transform={`rotate(${collapsed ? 0 : 90}deg)`}
							style:transition={reduced
								? 'none'
								: 'transform var(--spring-snappy-duration) var(--spring-snappy)'}
							aria-hidden="true"><ChevronRight size={13} strokeWidth={1.75} /></span
						>{collapsed ? t.showReplies(countTree(replies)) : t.hideReplies}{#if collapsed}<span
								class="arc-comment-thread__stack"
								aria-hidden="true"
								>{#each [...authorsOf(replies).values()].slice(0, 3) as author (author.id)}<ThreadAvatar
										{author}
										size={18}
									/>{/each}</span
							>{/if}</button
					>{/if}
			</div>
		</article>
		{#if replies.length && !collapsed}<div
				class="arc-comment-thread__replies-wrap"
				in:heightPresence={{ skip: !mounted.current, reduced }}
				out:heightPresence={{ reduced }}
			>
				<ul class="arc-comment-thread__replies" data-depth={depth + 1}>
					{#each replies as reply (reply.id)}{@render renderComment(reply, depth + 1)}{/each}
				</ul>
			</div>{/if}
	</li>
{/snippet}
<section
	bind:this={ref}
	class={['arc-comment-thread__root', className]}
	data-resolved={isResolved || undefined}
	aria-label={t.thread}
>
	<ThreadHeight {reduced} morphKey={isResolved ? 'resolved' : 'thread'}>
		{#key isResolved}{#if isResolved}<div
					class="arc-comment-thread__resolved"
					in:swap={{
						blur: reduced ? 0 : 2,
						duration: reduced ? 0 : 240,
						easing: m.ease.enter,
						skip: !mounted.current
					}}
					out:swap={{
						blur: reduced ? 0 : 2,
						duration: reduced ? 0 : 240,
						easing: m.ease.enter,
						pop: true
					}}
				>
					<span class="arc-comment-thread__resolved-icon" aria-hidden="true"
						><Check size={14} strokeWidth={2} /></span
					><span class="arc-comment-thread__resolved-text"
						><span class="arc-comment-thread__resolved-title"
							>{t.resolved}{#if title}{' · '}<span class="arc-comment-thread__resolved-subject"
									>{@render subject()}</span
								>{/if}</span
						><span class="arc-comment-thread__resolved-meta"
							>{t.commentCount(total)} · {t.peopleCount(participants.length)}</span
						></span
					><span class="arc-comment-thread__stack" aria-hidden="true"
						>{#each participants.slice(0, 3) as author (author.id)}<ThreadAvatar
								{author}
								size={22}
							/>{/each}</span
					><button
						type="button"
						class="arc-comment-thread__reopen"
						data-reopen=""
						onclick={() => setResolved(false)}
						><RotateCcw size={14} strokeWidth={1.75} />{t.reopen}</button
					>
				</div>
			{:else}<div
					class="arc-comment-thread__thread"
					in:swap={{
						blur: reduced ? 0 : 2,
						duration: reduced ? 0 : 240,
						easing: m.ease.enter,
						skip: !mounted.current
					}}
					out:swap={{
						blur: reduced ? 0 : 2,
						duration: reduced ? 0 : 240,
						easing: m.ease.enter,
						pop: true
					}}
				>
					<header class="arc-comment-thread__header">
						<div class="arc-comment-thread__heading">
							{#if title}<h3 class="arc-comment-thread__title">{@render subject()}</h3>{/if}<span
								class="arc-comment-thread__subtitle">{t.commentCount(total)}</span
							>
						</div>
						<button
							type="button"
							class="arc-comment-thread__resolve"
							data-resolve=""
							disabled={!total}
							onclick={() => setResolved(true)}
							><Check size={15} strokeWidth={1.75} aria-hidden="true" />{t.resolve}</button
						>
					</header>
					{#if list.length}<ul class="arc-comment-thread__list">
							{#each list as comment (comment.id)}{@render renderComment(comment, 0)}{/each}
						</ul>{:else}<p class="arc-comment-thread__empty">{t.empty}</p>{/if}
					<div class="arc-comment-thread__composer-area">
						{#if replyTo}{@const replyLabel = t.replyingTo(replyTo.name)}{@const at =
								replyLabel.indexOf(replyTo.name)}
							<div
								class="arc-comment-thread__replying"
								in:heightPresence={{ reduced }}
								out:heightPresence={{ reduced }}
							>
								<span class="arc-comment-thread__replying-inner"
									><CornerDownRight size={13} strokeWidth={1.75} aria-hidden="true" /><span
										>{#if at >= 0}{replyLabel.slice(0, at)}<span
												class="arc-comment-thread__replying-name">{replyTo.name}</span
											>{replyLabel.slice(at + replyTo.name.length)}{:else}{replyLabel}{/if}</span
									><button
										type="button"
										class="arc-comment-thread__icon-action"
										aria-label={t.cancelReply}
										onclick={() => (replyTo = null)}><X size={14} strokeWidth={1.75} /></button
									></span
								>
							</div>{/if}<CommentComposer
							people={mentionable}
							{placeholder}
							submitLabel={t.send}
							cancelLabel={t.cancel}
							mentionsLabel={t.mentions}
							{focusKey}
							onSubmit={addReply}
							onCancel={replyTo ? () => (replyTo = null) : undefined}
							>{#snippet leading()}<ThreadAvatar author={currentUser} />{/snippet}</CommentComposer
						>
					</div>
				</div>{/if}{/key}
	</ThreadHeight>
</section>
