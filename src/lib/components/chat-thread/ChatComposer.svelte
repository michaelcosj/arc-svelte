<script lang="ts">
	import { untrack, onDestroy } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { flip } from 'svelte/animate';
	import {
		Mounted,
		PhysicalSpring,
		springCurve,
		motionTokens as m,
		swap,
		heightPresence
	} from '#lib/motion';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import FileText from '@lucide/svelte/icons/file-text';
	import X from '@lucide/svelte/icons/x';
	import type { ChatComposerProps } from './types';
	import { withDefaults, COMPOSER_LABELS, formatBytes } from './chat';
	import './chat-thread.css';
	let {
		onSend,
		placeholder = 'Message',
		allowAttachments = true,
		accept,
		disabled = false,
		labels,
		class: className,
		ref = $bindable(null)
	}: ChatComposerProps = $props();
	let text = $state(''),
		files = $state<{ id: string; file: File; url?: string }[]>([]),
		dragging = $state(false),
		sent = $state(0),
		area = $state<HTMLTextAreaElement>(),
		picker = $state<HTMLInputElement>();
	let counter = 0;
	const reduced = $derived(Boolean(prefersReducedMotion.current)),
		t = $derived(withDefaults(COMPOSER_LABELS, labels)),
		ready = $derived(!disabled && (!!text.trim() || !!files.length)),
		mounted = new Mounted(),
		height = new PhysicalSpring(40, { visualDuration: 0.4, bounce: 0 });
	function mirror(node: HTMLElement) {
		const fit = () => {
			const target = Math.min(150, node.offsetHeight);
			if (!mounted.current || reduced) height.jump(target);
			else height.set(target);
		};
		untrack(fit);
		const observer = new ResizeObserver(fit);
		observer.observe(node);
		return () => observer.disconnect();
	}
	$effect(() => {
		ref = { focus: () => area?.focus() };
		return () => {
			ref = null;
		};
	});
	onDestroy(() => untrack(() => files.forEach((e) => e.url && URL.revokeObjectURL(e.url))));
	function add(list: FileList | File[] | null) {
		if (!allowAttachments || !list) return;
		files = [
			...files,
			...Array.from(list)
				.slice(0, 10)
				.map((file) => ({
					id: `file-${++counter}`,
					file,
					url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
				}))
		];
	}
	function remove(id: string) {
		files = files.filter((e) => {
			if (e.id === id && e.url) URL.revokeObjectURL(e.url);
			return e.id !== id;
		});
	}
	function send() {
		if (!ready) return;
		onSend({ text: text.trim(), files: files.map((e) => e.file) });
		files.forEach((e) => e.url && URL.revokeObjectURL(e.url));
		files = [];
		text = '';
		sent++;
		area?.focus();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={['arc-chat-thread__composer', className]}
	data-dragging={dragging || undefined}
	ondragover={(e) => {
		if (allowAttachments && e.dataTransfer?.types.includes('Files')) {
			e.preventDefault();
			dragging = true;
		}
	}}
	ondragleave={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) dragging = false;
	}}
	ondrop={(e) => {
		if (!allowAttachments) return;
		e.preventDefault();
		dragging = false;
		add(e.dataTransfer?.files ?? null);
	}}
>
	{#if files.length}<div class="arc-chat-thread__tray-clip" transition:heightPresence={{ reduced }}>
			<ul class="arc-chat-thread__tray" aria-label={t.attachments}>
				{#each files as entry (entry.id)}<li
						class="arc-chat-thread__pending"
						animate:flip={reduced ? { duration: 0 } : m.spring.smooth}
						in:swap={{
							scale: reduced ? 1 : 0.9,
							blur: reduced ? 0 : 2,
							...springCurve({ visualDuration: 0.3, bounce: 0.22 })
						}}
						out:swap={{ scale: reduced ? 1 : 0.9, duration: reduced ? 120 : 200, pop: true }}
					>
						{#if entry.url}<img
								class="arc-chat-thread__pending-image"
								src={entry.url}
								alt=""
							/>{:else}<span class="arc-chat-thread__pending-file"
								><FileText size={16} strokeWidth={1.75} aria-hidden="true" /><span
									class="arc-chat-thread__pending-name">{entry.file.name}</span
								><span class="arc-chat-thread__pending-size">{formatBytes(entry.file.size)}</span
								></span
							>{/if}<button
							type="button"
							class="arc-chat-thread__remove"
							aria-label={t.removeFile(entry.file.name)}
							onclick={() => remove(entry.id)}><X size={12} strokeWidth={2.25} /></button
						>
					</li>{/each}
			</ul>
		</div>{/if}
	<div class="arc-chat-thread__input-row">
		{#if allowAttachments}<button
				type="button"
				class="arc-chat-thread__attach"
				aria-label={t.attach}
				{disabled}
				onclick={() => picker?.click()}><Paperclip size={18} strokeWidth={1.75} /></button
			><input
				bind:this={picker}
				type="file"
				multiple
				{accept}
				hidden
				onchange={(e) => {
					add(e.currentTarget.files);
					e.currentTarget.value = '';
				}}
			/>{/if}
		<div class="arc-chat-thread__box">
			<div class="arc-chat-thread__field" style:height={`${height.current}px`}>
				<div class="arc-chat-thread__mirror" aria-hidden="true" {@attach mirror}>
					{text}{'\u200b'}
				</div>
				<textarea
					bind:this={area}
					class="arc-chat-thread__textarea"
					bind:value={text}
					rows={1}
					{placeholder}
					{disabled}
					aria-label={placeholder}
					onkeydown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
							e.preventDefault();
							send();
						}
					}}
					onpaste={(e) => {
						if (allowAttachments && e.clipboardData?.files.length) {
							e.preventDefault();
							add(e.clipboardData.files);
						}
					}}></textarea>
			</div>
			<button
				type="button"
				class="arc-chat-thread__send"
				data-ready={ready || undefined}
				aria-label={t.send}
				aria-disabled={!ready}
				onclick={send}
				>{#key sent}<span
						class="arc-chat-thread__send-icon"
						in:swap={{ y: reduced ? 0 : 14, ...m.spring.snappy, skip: !mounted.current }}
						out:swap={{ y: reduced ? 0 : -18, duration: 160, pop: true }}
						><ArrowUp size={16} strokeWidth={2.25} /></span
					>{/key}</button
			>
		</div>
	</div>
</div>
