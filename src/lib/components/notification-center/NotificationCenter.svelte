<script lang="ts">
	import { Popover } from 'bits-ui';
	import { untrack, tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, motionTokens as m, swap, heightPresence, Highlight } from '#lib/motion';
	import { Avatar } from '#arc/avatar';
	import Bell from '@lucide/svelte/icons/bell';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import NotificationCount from './NotificationCount.svelte';
	import NotificationText from './NotificationText.svelte';
	import ReadAction from './ReadAction.svelte';
	import type { NotificationCenterProps, NotificationItem } from './types';
	import './notification-center.css';
	let {
		notifications,
		label = 'Notifications',
		onReadChange,
		onDismiss,
		open = $bindable(undefined),
		onOpenChange,
		avoidCollisions = true
	}: NotificationCenterProps = $props();
	let items = $state(untrack(() => notifications)),
		internalOpen = $state(false),
		panelReady = $state(false),
		view = $state<'all' | 'unread'>('all'),
		expandedId = $state<string | null>(null),
		bulk = $state(false),
		switchRoot = $state<HTMLDivElement>(),
		panel = $state<HTMLDivElement | null>(null);
	const isOpen = $derived(open ?? internalOpen),
		unreadCount = $derived(items.filter((i) => !i.read).length),
		readCount = $derived(items.length - unreadCount),
		visible = $derived(view === 'unread' ? items.filter((i) => !i.read) : items),
		summary = $derived(
			unreadCount
				? `${unreadCount} update${unreadCount === 1 ? '' : 's'} waiting for you`
				: 'You’re all caught up'
		),
		reduced = $derived(Boolean(prefersReducedMotion.current)),
		mounted = new Mounted(),
		highlight = new Highlight(() => ({ reduced }));
	$effect(() => {
		void view;
		void isOpen;
		void switchRoot;
		untrack(() =>
			highlight.move(switchRoot?.querySelector<HTMLElement>('[aria-pressed=true]'), true)
		);
	});
	$effect(() => {
		const current = isOpen;
		panelReady = false;
		if (current) {
			const frame = requestAnimationFrame(() => {
				panelReady = true;
			});
			return () => cancelAnimationFrame(frame);
		}
	});
	function setOpen(next: boolean) {
		if (open === undefined) internalOpen = next;
		else if (!onOpenChange) open = next;
		onOpenChange?.(next);
	}
	async function recover(next?: string, fallback: 'all' | 'unread' = 'unread') {
		await tick();
		(next
			? panel?.querySelector<HTMLElement>(`[data-notification-id="${CSS.escape(next)}"]`)
			: panel?.querySelector<HTMLElement>(`[data-view="${fallback}"]`)
		)?.focus();
	}
	function toggleRead(item: NotificationItem) {
		const next = !item.read;
		if (next && view === 'unread') {
			const at = visible.findIndex((i) => i.id === item.id);
			void recover(visible[at + 1]?.id ?? visible[at - 1]?.id);
		}
		bulk = false;
		items = items.map((i) => (i.id === item.id ? { ...i, read: next } : i));
		if (next && view === 'unread') expandedId = null;
		onReadChange?.(item, next);
	}
	function markAllRead() {
		items.filter((i) => !i.read).forEach((i) => onReadChange?.(i, true));
		bulk = true;
		items = items.map((i) => ({ ...i, read: true }));
		expandedId = null;
		void recover(undefined, view);
	}
	function dismiss(item: NotificationItem) {
		const at = visible.findIndex((i) => i.id === item.id);
		void recover(visible[at + 1]?.id ?? visible[at - 1]?.id);
		bulk = false;
		items = items.filter((i) => i.id !== item.id);
		if (expandedId === item.id) expandedId = null;
		onDismiss?.(item);
	}
	function clearRead() {
		items.filter((i) => i.read).forEach((i) => onDismiss?.(i));
		bulk = true;
		items = items.filter((i) => !i.read);
		void recover(undefined, 'all');
	}
</script>

<Popover.Root bind:open={() => isOpen, setOpen}
	><Popover.Trigger
		class="arc-notification-center__trigger"
		type="button"
		aria-label={`${label}${unreadCount ? `, ${unreadCount} unread` : ''}`}
		><span
			style:transform={`rotate(${isOpen && !reduced ? -12 : 0}deg)`}
			style:transition={reduced
				? 'none'
				: 'transform var(--spring-snappy-duration) var(--spring-snappy)'}
			><Bell size={19} strokeWidth={1.75} aria-hidden="true" /></span
		>{#each unreadCount > 0 ? ['badge'] : [] as key (key)}<span
				class="arc-notification-center__badge"
				aria-hidden="true"
				in:swap={{ scale: 0.6, ...m.spring.snappy, skip: reduced || !mounted.current }}
				out:swap={{
					scale: reduced ? 1 : 0.6,
					duration: reduced ? 120 : 160,
					easing: m.ease.standard
				}}
				><NotificationCount
					value={unreadCount}
					display={unreadCount > 9 ? '9+' : String(unreadCount)}
					{reduced}
				/></span
			>{/each}</Popover.Trigger
	><Popover.Portal
		><Popover.Content
			bind:ref={panel}
			class="arc-notification-center__panel"
			role="dialog"
			align="center"
			side="bottom"
			sideOffset={12}
			collisionPadding={12}
			{avoidCollisions}
			aria-label={label}
			trapFocus={false}
		>
			<div class="arc-notification-center__header">
				<div>
					<div class="arc-notification-center__heading">
						<h2>{label}</h2>
						<span class="arc-notification-center__count"
							><NotificationCount value={unreadCount} {reduced} /></span
						>
					</div>
					<p aria-live="polite"><NotificationText text={summary} {reduced} /></p>
				</div>
				<Popover.Close class="arc-notification-center__close" aria-label="Close notifications"
					><X size={17} strokeWidth={1.75} aria-hidden="true" /></Popover.Close
				>
			</div>
			<div class="arc-notification-center__toolbar">
				<div
					bind:this={switchRoot}
					class="arc-notification-center__view-switch"
					role="group"
					aria-label="Show notifications"
					style="position:relative;isolation:isolate"
				>
					<span
						class="arc-notification-center__view-highlight"
						hidden={!highlight.shown}
						style={`${highlight.style};inset:auto;top:0;left:0;z-index:0;`}
						aria-hidden="true"
					></span>{#each ['all', 'unread'] as next (next)}<button
							type="button"
							data-view={next}
							class={view === next ? 'arc-notification-center__view-active' : undefined}
							aria-pressed={view === next}
							onclick={() => {
								bulk = false;
								view = next as 'all' | 'unread';
								expandedId = null;
							}}><span>{next === 'all' ? 'All' : 'Unread'}</span></button
						>{/each}
				</div>
				{#each unreadCount > 0 ? ['mark-all'] : [] as key (key)}<button
						type="button"
						class="arc-notification-center__mark-all"
						onclick={markAllRead}
						in:swap={{
							blur: reduced ? 0 : 2,
							duration: reduced ? 0 : 240,
							easing: m.ease.enter,
							skip: !mounted.current
						}}
						out:swap={{
							blur: reduced ? 0 : 2,
							duration: reduced ? 120 : 160,
							easing: m.ease.standard
						}}
						><CheckCheck size={15} strokeWidth={1.75} aria-hidden="true" /><span>Mark all read</span
						></button
					>{/each}
			</div>
			<div
				class="arc-notification-center__list"
				role="list"
				aria-label={view === 'all' ? 'All notifications' : 'Unread notifications'}
			>
				{#each visible as item, index (item.id)}<div
						role="listitem"
						class="arc-notification-center__row"
						in:heightPresence={{ skip: !panelReady, reduced }}
						out:heightPresence={{
							reduced,
							delay: bulk ? Math.min(index * 35, 200) : 0,
							fade: { duration: 160, easing: m.ease.standard }
						}}
					>
						<article
							class={[
								'arc-notification-center__item',
								item.read && 'arc-notification-center__item-read',
								expandedId === item.id && 'arc-notification-center__item-expanded'
							]}
							style={`--index:${Math.min(index, 7)}`}
						>
							<div class="arc-notification-center__item-main">
								{#if item.actor}<Avatar
										name={item.actor.name}
										src={item.actor.photo}
										size="md"
									/>{:else}{@const Icon =
										item.tone === 'warning'
											? TriangleAlert
											: item.tone === 'success'
												? CircleCheck
												: MessageCircle}<span
										class={[
											'arc-notification-center__event-icon',
											`arc-notification-center__${item.tone ?? 'info'}`
										]}
										aria-hidden="true"><Icon size={18} strokeWidth={1.7} /></span
									>{/if}<button
									type="button"
									data-notification-id={item.id}
									class="arc-notification-center__item-toggle"
									aria-expanded={expandedId === item.id}
									aria-label={`${item.title}${item.read ? '' : ', unread'}. ${expandedId === item.id ? 'Hide details' : 'Show details'}`}
									onclick={() => (expandedId = expandedId === item.id ? null : item.id)}
									><span class="arc-notification-center__item-title"
										><strong>{item.title}</strong
										>{#each !item.read ? ['dot'] : [] as key (key)}<span
												class="arc-notification-center__unread-dot"
												aria-hidden="true"
												in:swap={{
													scale: 0.3,
													...m.spring.snappy,
													skip: reduced || !mounted.current
												}}
												out:swap={{
													scale: reduced ? 1 : 0.3,
													duration: reduced ? 120 : 160,
													delay: bulk ? Math.min(index * 35, 200) : 0,
													easing: m.ease.standard
												}}
											></span>{/each}</span
									><span class="arc-notification-center__item-preview"
										>{item.description ??
											(item.actor ? `From ${item.actor.name}` : 'View update details')}</span
									></button
								><time class="arc-notification-center__time">{item.time}</time>
							</div>
							{#if expandedId === item.id}<div
									class="arc-notification-center__details"
									in:heightPresence={{ reduced }}
									out:heightPresence={{ reduced }}
								>
									<p>
										{item.description ??
											(item.actor
												? `${item.actor.name} shared an update with you.`
												: 'This update is ready to review.')}
									</p>
									<div class="arc-notification-center__item-actions">
										<button type="button" onclick={() => toggleRead(item)}
											><ReadAction read={item.read} {reduced} /></button
										><button type="button" onclick={() => dismiss(item)}
											><X size={14} strokeWidth={1.75} aria-hidden="true" />Dismiss</button
										>
									</div>
								</div>{/if}
						</article>
					</div>{/each}
				{#if !visible.length}<div
						class="arc-notification-center__empty-frame"
						in:heightPresence={{
							reduced,
							heightDelay: bulk ? 105 : 0,
							fade: { duration: 240, easing: m.ease.enter, delay: 160 }
						}}
						out:heightPresence={{ reduced }}
					>
						<div
							class="arc-notification-center__empty"
							in:swap={{
								y: 6,
								duration: 240,
								delay: 160,
								easing: m.ease.enter,
								opacity: 1,
								skip: reduced
							}}
						>
							<CircleCheck size={24} strokeWidth={1.5} aria-hidden="true" /><strong
								><NotificationText
									text={view === 'unread' ? 'Nothing unread' : 'All clear'}
									{reduced}
								/></strong
							>
							<p>
								<NotificationText
									text={view === 'unread'
										? 'You’ve seen every update.'
										: 'New updates will appear here.'}
									{reduced}
								/>
							</p>
							{#if view === 'unread' && items.length}<button
									type="button"
									onclick={() => {
										bulk = false;
										view = 'all';
									}}>View all updates</button
								>{/if}
						</div>
					</div>{/if}
			</div>
			{#each readCount > 0 ? ['footer'] : [] as key (key)}<div
					class="arc-notification-center__footer-frame"
					in:heightPresence={{ reduced, skip: !panelReady }}
					out:heightPresence={{ reduced }}
				>
					<div class="arc-notification-center__footer">
						<span><NotificationCount value={readCount} {reduced} /> read</span><button
							type="button"
							onclick={clearRead}>Clear read</button
						>
					</div>
				</div>{/each}
		</Popover.Content></Popover.Portal
	></Popover.Root
>
