<script lang="ts">
	import { onMount, untrack, onDestroy } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { prefersReducedMotion } from 'svelte/motion';
	import { flip } from 'svelte/animate';
	import {
		Mounted,
		PhysicalSpring,
		springCurve,
		SharedPosition,
		motionTokens as m,
		swap,
		heightPresence,
		WidthMorph
	} from '#lib/motion';
	import FileText from '@lucide/svelte/icons/file-text';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ChatAvatar from './ChatAvatar.svelte';
	import ChatCount from './ChatCount.svelte';
	import ChatComposer from './ChatComposer.svelte';
	import ReactionPicker from './ReactionPicker.svelte';
	import type {
		ChatThreadProps,
		ChatMessage,
		ChatParticipant,
		ChatDraft,
		ChatComposerHandle
	} from './types';
	import {
		THREAD_LABELS,
		withDefaults,
		relativeDay,
		toDate,
		dayKey,
		dayLabel,
		formatBytes
	} from './chat';
	import './chat-thread.css';
	let {
		participants,
		currentUserId,
		messages: messagesProp,
		defaultMessages,
		typing = [],
		readBy,
		onSend,
		onReact,
		onRetry,
		reactions = ['👍', '❤️', '😂', '🎉', '👀', '🙏'],
		placeholder = 'Message',
		composer = true,
		allowAttachments = true,
		accept,
		groupWindow = 300000,
		locale = 'en-US',
		label = 'Conversation',
		labels,
		class: className,
		ref = $bindable(null)
	}: ChatThreadProps = $props();
	let inner = $state<ChatMessage[]>(untrack(() => defaultMessages ?? [])),
		scroller = $state<HTMLDivElement>(),
		content = $state<HTMLDivElement>(),
		composerRef = $state<ChatComposerHandle | null>(null),
		atBottom = $state(true),
		far = $state(false),
		seen = $state(untrack(() => (messagesProp ?? defaultMessages ?? []).length)),
		picker = $state<string | null>(null);
	let stick = true,
		counter = 0;
	const urls: string[] = [];
	const readerPositions = new SharedPosition(() => ({
		reduced,
		spec: { visualDuration: 0.44, bounce: 0 }
	}));
	const mounted = new Mounted(),
		reduced = $derived(Boolean(prefersReducedMotion.current)),
		messages = $derived(messagesProp ?? inner),
		people = $derived(new Map(participants.map((p) => [p.id, p]))),
		t = $derived(
			withDefaults(
				{ ...THREAD_LABELS, today: relativeDay(locale, 0), yesterday: relativeDay(locale, -1) },
				labels
			)
		),
		time = $derived(new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })),
		y = new PhysicalSpring(0, { visualDuration: 0.44, bounce: 0 }),
		pillWidth = new WidthMorph(() => ({ reduced }));
	type Row =
		| { type: 'day'; key: string; label: string }
		| {
				type: 'message';
				key: string;
				message: ChatMessage;
				author: ChatParticipant;
				mine: boolean;
				first: boolean;
				last: boolean;
				index: number;
		  };
	const rows = $derived.by(() => {
		const out: Row[] = [];
		let lastDay = '';
		messages.forEach((message, index) => {
			const date = toDate(message.createdAt),
				key = dayKey(date);
			if (key !== lastDay) {
				out.push({
					type: 'day',
					key: `day-${key}`,
					label: mounted.current ? dayLabel(date, locale, t) : ''
				});
				lastDay = key;
			}
			const joins = (other: ChatMessage | undefined) =>
				!!other &&
				other.authorId === message.authorId &&
				dayKey(toDate(other.createdAt)) === key &&
				Math.abs(+toDate(other.createdAt) - +date) <= groupWindow;
			out.push({
				type: 'message',
				key: message.id,
				message,
				index,
				author: people.get(message.authorId) ?? { id: message.authorId, name: t.unknownAuthor },
				mine: message.authorId === currentUserId,
				first: !joins(messages[index - 1]),
				last: !joins(messages[index + 1])
			});
		});
		return out;
	});
	const receipts = $derived.by(() => {
			const map = new SvelteMap<string, ChatParticipant[]>();
			for (const [personId, messageId] of Object.entries(readBy ?? {})) {
				const who = people.get(personId),
					read = messages.find((m) => m.id === messageId);
				if (!who || personId === currentUserId || !read || read.authorId === personId) continue;
				map.set(messageId, [...(map.get(messageId) ?? []), who]);
			}
			return map;
		}),
		readIndex = $derived(
			Math.max(-1, ...Array.from(receipts.keys(), (id) => messages.findIndex((m) => m.id === id)))
		),
		lastMine = $derived(messages.findLastIndex((m) => m.authorId === currentUserId)),
		typers = $derived(
			typing
				.map((id) => people.get(id))
				.filter((p): p is ChatParticipant => !!p && p.id !== currentUserId)
		),
		unread = $derived(
			atBottom ? 0 : messages.slice(seen).filter((m) => m.authorId !== currentUserId).length
		),
		pill = $derived(!atBottom && (unread > 0 || far));
	const known = new SvelteSet(untrack(() => messages.map((m) => m.id)));
	$effect.pre(() => {
		const current = messages;
		void readBy;
		untrack(() => {
			const fresh = current.filter((m) => !known.has(m.id));
			fresh.forEach((m) => known.add(m.id));
			if (fresh.some((m) => m.authorId === currentUserId)) stick = true;
			void unread;
			readerPositions.capture();
			pillWidth.changed();
		});
	});
	function track(node: HTMLElement) {
		let last = node.offsetHeight;
		const viewport = node.closest<HTMLElement>('[data-chat-scroller]');
		if (viewport) viewport.scrollTop = viewport.scrollHeight;
		const observer = new ResizeObserver(() => {
			const h = node.offsetHeight,
				delta = h - last;
			last = h;
			if (!stick || !scroller) return;
			scroller.scrollTop = scroller.scrollHeight;
			if (delta > 0 && delta < scroller.clientHeight && !reduced) {
				y.jump(y.current + delta);
				y.set(0);
			}
		});
		observer.observe(node);
		return () => observer.disconnect();
	}
	function scroll() {
		if (!scroller) return;
		const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
		stick = distance < 48;
		atBottom = stick;
		far = distance > 180;
		if (stick) seen = messages.length;
	}
	function scrollToBottom(smooth = true) {
		stick = true;
		scroller?.scrollTo({
			top: scroller.scrollHeight,
			behavior: smooth && !reduced ? 'smooth' : 'auto'
		});
	}
	onMount(() => {
		ref = { scrollToBottom, focusComposer: () => composerRef?.focus() };
		return () => {
			ref = null;
		};
	});
	onDestroy(() => urls.forEach((url) => URL.revokeObjectURL(url)));

	function react(id: string, emoji: string) {
		picker = null;

		onReact?.(id, emoji);
		if (messagesProp !== undefined) return;
		inner = inner.map((message) => {
			if (message.id !== id) return message;
			const list = [...(message.reactions ?? [])],
				at = list.findIndex((r) => r.emoji === emoji),
				found = list[at];
			if (!found) list.push({ emoji, count: 1, mine: true });
			else list[at] = { ...found, count: found.count + (found.mine ? -1 : 1), mine: !found.mine };
			return { ...message, reactions: list.filter((r) => r.count > 0) };
		});
	}
	function send(draft: ChatDraft) {
		stick = true;
		const result = onSend?.(draft);
		if (messagesProp !== undefined) return result;
		const attachments = draft.files.map((file, index) => {
			const url = URL.createObjectURL(file);
			urls.push(url);
			return {
				id: `local-file-${++counter}-${index}`,
				name: file.name,
				size: file.size,
				kind: file.type.startsWith('image/') ? ('image' as const) : ('file' as const),
				url
			};
		});
		inner = [
			...inner,
			{
				id: `local-${Date.now()}-${++counter}`,
				authorId: currentUserId,
				text: draft.text || undefined,
				attachments,
				createdAt: new Date(),
				status: 'sent'
			}
		];
	}
</script>

<div class={['arc-chat-thread__root', className]}>
	<div class="arc-chat-thread__viewport">
		<div
			bind:this={scroller}
			class="arc-chat-thread__scroller"
			onscroll={scroll}
			data-chat-scroller=""
		>
			<div class="arc-chat-thread__track">
				<div
					bind:this={content}
					class="arc-chat-thread__content"
					style:transform={`translateY(${y.current}px)`}
					{@attach track}
				>
					<ol
						class="arc-chat-thread__list"
						role="log"
						aria-label={label}
						aria-live="polite"
						aria-relevant="additions"
					>
						{#each rows as row (row.key)}{#if row.type === 'day'}<li class="arc-chat-thread__day">
									<span>{row.label}</span>
								</li>{:else}{@const { message, author, mine, first, last, index } =
									row}{@const date = toDate(message.createdAt)}{@const seenBy =
									receipts.get(message.id) ?? []}{@const showStatus =
									index === lastMine && mine}{@const status =
									message.status === 'failed'
										? 'failed'
										: message.status === 'sending'
											? 'sending'
											: readIndex >= index
												? 'read'
												: (message.status ?? 'sent')}{@const images =
									message.attachments?.filter((a) => a.kind === 'image' && a.url) ??
									[]}{@const files =
									message.attachments?.filter((a) => a.kind !== 'image' || !a.url) ?? []}
								<li
									class="arc-chat-thread__row"
									data-mine={mine || undefined}
									data-first={first || undefined}
									data-last={last || undefined}
									data-failed={message.status === 'failed' || undefined}
									style:transform-origin={mine ? '100% 100%' : '0 100%'}
									in:swap={{
										scale: reduced ? 1 : 0.92,
										y: reduced ? 0 : 14,
										x: reduced ? 0 : mine ? 8 : -8,
										blur: reduced ? 0 : 2,
										...springCurve({ visualDuration: 0.46, bounce: 0.12 }),
										fade: { duration: 240, easing: m.ease.enter },
										skip: !mounted.current
									}}
									out:swap={{ duration: 180 }}
								>
									{#if !mine}<div class="arc-chat-thread__gutter"></div>{/if}
									<div class="arc-chat-thread__stack">
										{#if first}<p class="arc-chat-thread__meta">
												{#if !mine}<span class="arc-chat-thread__author">{author.name}</span
													>{/if}<time datetime={date.toISOString()}
													>{mounted.current ? time.format(date) : ''}</time
												>
											</p>{/if}
										<div class="arc-chat-thread__line">
											{#if !mine && last}<span class="arc-chat-thread__face"
													><ChatAvatar person={author} size={28} /></span
												>{/if}
											<div class="arc-chat-thread__parts">
												{#if images.length}<div
														class="arc-chat-thread__gallery"
														data-count={Math.min(images.length, 4)}
													>
														{#each images.slice(0, 4) as image, at (image.id)}<a
																class="arc-chat-thread__image"
																href={image.url}
																target="_blank"
																rel="noreferrer"
																style:aspect-ratio={images.length === 1 &&
																image.width &&
																image.height
																	? `${image.width} / ${image.height}`
																	: undefined}
																><img
																	src={image.url}
																	alt={image.alt ?? image.name}
																	loading="lazy"
																/>{#if at === 3 && images.length > 4}<span
																		class="arc-chat-thread__more">+{images.length - 4}</span
																	>{/if}</a
															>{/each}
													</div>{/if}
												{#each files as file (file.id)}<a
														class="arc-chat-thread__file"
														href={file.url}
														download={file.name}
														target="_blank"
														rel="noreferrer"
														><FileText size={18} strokeWidth={1.75} aria-hidden="true" /><span
															class="arc-chat-thread__file-text"
															><span class="arc-chat-thread__file-name">{file.name}</span
															>{#if file.size !== undefined}<span class="arc-chat-thread__file-size"
																	>{formatBytes(file.size)}</span
																>{/if}</span
														></a
													>{/each}
												{#if message.text}<div
														class="arc-chat-thread__bubble"
														title={mounted.current
															? date.toLocaleString(locale, {
																	dateStyle: 'medium',
																	timeStyle: 'short'
																})
															: undefined}
													>
														{message.text}
													</div>{/if}
											</div>
											<ReactionPicker
												open={picker === message.id}
												{mine}
												{reactions}
												{reduced}
												labels={t}
												id={`picker-${message.id}`}
												onToggle={() => (picker = picker === message.id ? null : message.id)}
												onClose={() => (picker = null)}
												onPick={(emoji) => react(message.id, emoji)}
											/>
										</div>
										{#if message.reactions?.length}<div
												class="arc-chat-thread__reaction-clip"
												transition:heightPresence={{ reduced, skip: !mounted.current }}
											>
												<ul class="arc-chat-thread__reactions" aria-label={t.reactions}>
													{#each message.reactions as reaction (reaction.emoji)}<li
															animate:flip={reduced ? { duration: 0 } : m.spring.smooth}
															in:swap={{
																scale: reduced ? 1 : 0.6,
																...m.spring.snappy,
																skip: !mounted.current
															}}
															out:swap={{ scale: reduced ? 1 : 0.6, ...m.spring.snappy, pop: true }}
														>
															<button
																type="button"
																class="arc-chat-thread__reaction"
																aria-pressed={!!reaction.mine}
																aria-label={t.reactionCount(
																	reaction.emoji,
																	reaction.count,
																	!!reaction.mine
																)}
																onclick={() => react(message.id, reaction.emoji)}
																><span aria-hidden="true">{reaction.emoji}</span><ChatCount
																	value={reaction.count}
																	{reduced}
																/></button
															>
														</li>{/each}
												</ul>
											</div>{/if}
										{#if showStatus || seenBy.length}<div class="arc-chat-thread__receipts">
												{#if showStatus}<span class="arc-chat-thread__status" data-status={status}
														>{#if status === 'failed'}{t.failed}{#if onRetry}<button
																	type="button"
																	class="arc-chat-thread__retry"
																	onclick={() => onRetry?.(message.id)}
																	><RotateCw
																		size={12}
																		strokeWidth={2}
																		aria-hidden="true"
																	/>{t.retry}</button
																>{/if}{:else}{t[status]}{/if}</span
													>{/if}{#if seenBy.length}<span
														class="arc-chat-thread__readers"
														aria-label={t.readBy(seenBy.map((p) => p.name))}
														>{#each seenBy as person (person.id)}<span
																class="arc-chat-thread__reader"
																{@attach readerPositions.target(person.id)}
																><ChatAvatar {person} size={16} /></span
															>{/each}</span
													>{/if}
											</div>{/if}
									</div>
								</li>{/if}{/each}
						{#if typers.length}<li
								class="arc-chat-thread__row"
								data-first
								data-last
								aria-hidden="true"
								in:swap={{
									scale: reduced ? 1 : 0.9,
									y: reduced ? 0 : 8,
									...m.spring.snappy,
									skip: !mounted.current
								}}
								out:swap={{ scale: reduced ? 1 : 0.9, duration: 200 }}
							>
								<div class="arc-chat-thread__gutter"></div>
								<div class="arc-chat-thread__stack">
									<div class="arc-chat-thread__line">
										<span class="arc-chat-thread__face"
											><ChatAvatar person={typers[0]} size={28} /></span
										>
										<div class="arc-chat-thread__bubble arc-chat-thread__typing">
											<span class="arc-chat-thread__dots" aria-hidden="true"
												><i></i><i></i><i></i></span
											>
										</div>
									</div>
								</div>
							</li>{/if}
					</ol>
				</div>
			</div>
		</div>
		<span class="arc-chat-thread__sr-only" role="status"
			>{typers.length ? t.typing(typers.map((p) => p.name)) : ''}</span
		>{#if pill}<button
				type="button"
				class="arc-chat-thread__pill"
				onclick={() => scrollToBottom()}
				in:swap={{ y: reduced ? 0 : 12, scale: reduced ? 1 : 0.94, ...m.spring.morph }}
				out:swap={{ y: reduced ? 0 : 12, scale: reduced ? 1 : 0.94, duration: 200 }}
				><span class="arc-chat-thread__pill-icon"
					><ArrowDown size={14} strokeWidth={2} aria-hidden="true" /></span
				><span {@attach pillWidth.body}
					><span {@attach pillWidth.content}
						>{unread > 0 ? t.newMessages(unread) : t.jumpToLatest}</span
					></span
				></button
			>{/if}
	</div>
	{#if composer}<ChatComposer
			bind:ref={composerRef}
			onSend={send}
			{placeholder}
			{allowAttachments}
			{accept}
			labels={t}
		/>{/if}
</div>
