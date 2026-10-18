<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { Attachment } from 'svelte/attachments';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import { Mounted, heightPresence, swap, motionTokens as m } from '#lib/motion';
	import { formatSize, matchesAccept } from '#lib/files.ts';
	import type { FileDropzoneProps, FileDropzoneItem } from './types';
	import { copyMotion, collapse, shake, enterFade } from './motion';
	import FileRow from './FileRow.svelte';
	import ErrorRow from './ErrorRow.svelte';
	import './file-dropzone.css';
	let {
		accept,
		multiple = true,
		maxFiles = 5,
		onFilesChange,
		label = 'Add files',
		description = 'Drop files here or choose from your device',
		defaultItems,
		onUpload,
		maxSize,
		listPlacement = 'below',
		note,
		dropLabel,
		compactAt
	}: FileDropzoneProps = $props();
	let items = $state<FileDropzoneItem[]>(untrack(() => defaultItems ?? []));
	let dragging = $state(false);
	let error = $state('');
	let announcement = $state('');
	let batchStart = $state(0);
	let freshIds = $state<ReadonlySet<string>>(new Set());
	let hovered = $state(false);
	let focusWithin = $state(false);
	let input: HTMLInputElement;
	let trigger: HTMLButtonElement;
	let zone: HTMLDivElement;
	let dragDepth = 0,
		nextId = 0;
	const controllers = new SvelteMap<string, AbortController>();
	const removeRefs = new SvelteMap<string, HTMLButtonElement>();
	const ownedPreviews = new SvelteMap<string, string>();
	const uid = $props.id();
	const descriptionId = `${uid}-description`,
		noteId = `${uid}-note`;
	const reduced = $derived(!!prefersReducedMotion.current);
	const inside = $derived(listPlacement === 'inside');
	const compact = $derived(compactAt !== undefined && items.length >= compactAt);
	const rowsInside = $derived(inside && items.length > 0);
	const mounted = new Mounted();
	const motion = $derived(copyMotion(reduced, mounted.current));
	const dropCopy = $derived(
		dropLabel ??
			(onUpload ? 'Drop to upload' : multiple ? 'Drop to add files' : 'Drop to add the file')
	);
	const noteCopy = $derived(
		note ??
			(accept ? `Accepted: ${accept}` : `Up to ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'}`)
	);
	const glowOptions = { stiffness: 260 / 0.8 / 60 ** 2, damping: 32 / 0.8 / 60 };
	const glowX = new Spring(50, glowOptions),
		glowY = new Spring(50, glowOptions);
	const top = new Spring(
		untrack(() => (compact ? 16 : 26)),
		m.physics.smooth
	);
	const bottom = new Spring(
		untrack(() => (compact ? (rowsInside ? 8 : 16) : rowsInside ? 26 : 34)),
		m.physics.smooth
	);
	const listTop = new Spring(
		untrack(() => (items.length && !inside ? 4 : 0)),
		m.physics.smooth
	);
	const listBottom = new Spring(
		untrack(() => (items.length && inside ? 12 : 0)),
		m.physics.smooth
	);
	$effect(() => {
		void top.set(compact ? 16 : 26, { instant: reduced });
		void bottom.set(compact ? (rowsInside ? 8 : 16) : rowsInside ? 26 : 34, { instant: reduced });
		void listTop.set(items.length && !inside ? 4 : 0, { instant: reduced });
		void listBottom.set(items.length && inside ? 12 : 0, { instant: reduced });
	});
	onDestroy(() => {
		controllers.forEach((c) => c.abort());
		ownedPreviews.forEach((url) => URL.revokeObjectURL(url));
	});
	const fitEdge: Attachment<SVGRectElement> = (edge) => {
		const target = edge.closest<HTMLDivElement>('.arc-file-dropzone__dropzone');
		if (!target) return;
		const fit = () => {
			const width = target.offsetWidth - 1,
				height = target.offsetHeight - 1;
			const radius = Math.max(
				0,
				Math.min(
					parseFloat(getComputedStyle(target).borderTopLeftRadius) - 0.5,
					width / 2,
					height / 2
				)
			);
			const perimeter = 2 * (width + height) - 8 * radius + 2 * Math.PI * radius;
			edge.setAttribute('rx', String(radius));
			edge.setAttribute('pathLength', String(Math.max(8, Math.round(perimeter / 7)) * 7));
		};
		fit();
		let frame = 0;
		const follow = () => {
			fit();
			frame = requestAnimationFrame(follow);
		};
		const run = (event: TransitionEvent) => {
			if (event.target === target && event.propertyName.includes('radius')) {
				cancelAnimationFrame(frame);
				follow();
			}
		};
		const end = (event: TransitionEvent) => {
			if (event.target === target && event.propertyName.includes('radius')) {
				cancelAnimationFrame(frame);
				fit();
			}
		};
		target.addEventListener('transitionrun', run);
		target.addEventListener('transitionend', end);
		target.addEventListener('transitioncancel', end);
		const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
		observer?.observe(target);
		return () => {
			observer?.disconnect();
			cancelAnimationFrame(frame);
			target.removeEventListener('transitionrun', run);
			target.removeEventListener('transitionend', end);
			target.removeEventListener('transitioncancel', end);
		};
	};
	function track(event: DragEvent) {
		const box = zone.getBoundingClientRect();
		const instant = reduced || !dragging;
		void glowX.set(((event.clientX - box.left) / Math.max(1, box.width)) * 100, { instant });
		void glowY.set(((event.clientY - box.top) / Math.max(1, box.height)) * 100, { instant });
	}
	const clamp = (value: number) => Math.min(Math.max(value, 0), 100);
	const filesOf = (list: FileDropzoneItem[]) =>
		list.flatMap((item) => (item.file ? [item.file] : []));
	function patch(id: string, next: (item: FileDropzoneItem) => FileDropzoneItem) {
		items = items.map((item) => (item.id === id ? next(item) : item));
	}
	function startUpload(item: FileDropzoneItem) {
		if (!onUpload) return;
		controllers.get(item.id)?.abort();
		const controller = new AbortController();
		controllers.set(item.id, controller);
		patch(item.id, (current) => ({
			...current,
			status: 'uploading',
			progress: 0,
			error: undefined
		}));
		onUpload(
			{ ...item, status: 'uploading', progress: 0, error: undefined },
			{
				signal: controller.signal,
				onProgress: (percent) => {
					if (!controller.signal.aborted)
						patch(item.id, (current) =>
							current.status === 'uploading'
								? { ...current, progress: Math.max(current.progress ?? 0, clamp(percent)) }
								: current
						);
				}
			}
		)
			.then(
				() => {
					if (controller.signal.aborted) return;
					patch(item.id, (current) => ({ ...current, status: 'uploaded', progress: 100 }));
					announcement = `${item.name} uploaded`;
				},
				(reason: unknown) => {
					if (controller.signal.aborted) return;
					const message =
						reason instanceof Error && reason.message ? reason.message : 'Upload failed';
					patch(item.id, (current) => ({
						...current,
						status: 'failed',
						error: message,
						retryable: true
					}));
					announcement = `${item.name} failed. ${message}`;
				}
			)
			.finally(() => {
				if (controllers.get(item.id) === controller) controllers.delete(item.id);
			});
	}
	function addFiles(incoming: FileList | File[]) {
		const list = Array.from(incoming);
		const matching = list.filter((file) => matchesAccept(file, accept));
		const kept = multiple ? items : [];
		const same = (a: File, b: File) =>
			a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
		const fresh = matching.filter(
			(file, index) =>
				matching.findIndex((other) => same(other, file)) === index &&
				!kept.some((item) => item.file && same(item.file, file))
		);
		const room = multiple ? Math.max(0, maxFiles - kept.length) : 1;
		const added = fresh.slice(0, room).map((file): FileDropzoneItem => {
			const tooLarge = maxSize !== undefined && file.size > maxSize;
			const id = `${file.name}-${file.size}-${file.lastModified}-${nextId++}`;
			const preview =
				file.type.startsWith('image/') && typeof URL.createObjectURL === 'function'
					? URL.createObjectURL(file)
					: undefined;
			if (preview) ownedPreviews.set(id, preview);
			return {
				id,
				name: file.name,
				size: file.size,
				file,
				preview,
				status: tooLarge ? 'failed' : onUpload ? 'uploading' : undefined,
				progress: 0,
				error: tooLarge ? `File is larger than ${formatSize(maxSize!)}` : undefined,
				retryable: !tooLarge
			};
		});
		const rejected = matching.length !== list.length,
			overflow = fresh.length > added.length;
		error = rejected
			? list.length - matching.length === 1 && list.length === 1
				? `${list[0]!.name} is not an accepted file type.`
				: 'Some files were not added because their type is not accepted.'
			: overflow
				? `You can add up to ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'}.`
				: '';
		if ((rejected || overflow) && !reduced) shake(zone);
		if (!added.length) return;
		if (!multiple) {
			controllers.forEach((c) => c.abort());
			controllers.clear();
		}
		const next = [...kept, ...added];
		freshIds = new Set([...freshIds, ...added.map((item) => item.id)]);
		batchStart = kept.length;
		items = next;
		onFilesChange?.(filesOf(next));
		const failed = added.filter((item) => item.status === 'failed');
		announcement = `${added.length} ${added.length === 1 ? 'file' : 'files'} added.${failed.length ? ` ${failed.map((item) => `${item.name}: ${item.error}`).join('. ')}.` : ''}`;
		added.filter((item) => item.status === 'uploading').forEach(startUpload);
	}
	function removeItem(target: FileDropzoneItem) {
		controllers.get(target.id)?.abort();
		controllers.delete(target.id);
		const index = items.findIndex((item) => item.id === target.id);
		const neighbor = items[index + 1] ?? items[index - 1];
		const next = items.filter((item) => item.id !== target.id);
		const preview = ownedPreviews.get(target.id);
		if (preview) {
			ownedPreviews.delete(target.id);
			window.setTimeout(() => URL.revokeObjectURL(preview), 600);
		}
		items = next;
		error = '';
		announcement = `${target.name} removed`;
		if (target.file) onFilesChange?.(filesOf(next));
		requestAnimationFrame(() => (neighbor ? removeRefs.get(neighbor.id) : trigger)?.focus());
	}
	function retryItem(item: FileDropzoneItem) {
		announcement = `Retrying ${item.name}`;
		startUpload(item);
		requestAnimationFrame(() => removeRefs.get(item.id)?.focus());
	}
	function moveFocus(event: KeyboardEvent & { currentTarget: EventTarget & HTMLUListElement }) {
		if (event.key === 'Delete' || event.key === 'Backspace') {
			const remove = (event.target as HTMLElement)
				.closest('.arc-file-dropzone__row')
				?.querySelector<HTMLButtonElement>('.arc-file-dropzone__remove');
			if (remove) {
				event.preventDefault();
				remove.click();
			}
			return;
		}
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		const button = (event.target as HTMLElement).closest('button');
		const rows = Array.from(event.currentTarget.querySelectorAll('.arc-file-dropzone__row'));
		const row = button?.closest('.arc-file-dropzone__row');
		if (!button || !row) return;
		const next = rows[rows.indexOf(row) + (event.key === 'ArrowDown' ? 1 : -1)];
		if (!next) return;
		event.preventDefault();
		(
			next.querySelector<HTMLButtonElement>(
				button.classList.contains('arc-file-dropzone__retry')
					? '.arc-file-dropzone__retry'
					: '.arc-file-dropzone__remove'
			) ?? next.querySelector<HTMLButtonElement>('.arc-file-dropzone__remove')
		)?.focus();
	}
	$effect(() => {
		if (!hovered && !focusWithin) return;
		const paste = (event: ClipboardEvent) => {
			const files = event.clipboardData?.files;
			if (
				!files?.length ||
				(event.target as HTMLElement | null)?.closest(
					"input:not([type=file]), textarea, [contenteditable='true']"
				)
			)
				return;
			event.preventDefault();
			addFiles(files);
		};
		document.addEventListener('paste', paste);
		return () => document.removeEventListener('paste', paste);
	});
	const carriesFiles = (event: DragEvent) =>
		Array.from(event.dataTransfer?.types ?? []).includes('Files');
</script>

{#snippet list()}
	<ul
		class="arc-file-dropzone__list"
		aria-label="Files"
		aria-hidden={items.length ? undefined : true}
		onkeydown={moveFocus}
		style:padding-top={`${listTop.current}px`}
		style:padding-bottom={`${listBottom.current}px`}
	>
		{#each items as item, index (item.id)}
			<FileRow
				{item}
				present={() => items.some((row) => row.id === item.id)}
				{reduced}
				delay={reduced ? 0 : Math.min(Math.max(0, index - batchStart), 7) * m.stagger.item * 1.6}
				fresh={freshIds.has(item.id)}
				canRetry={!!onUpload}
				onRemove={() => removeItem(item)}
				onRetry={() => retryItem(item)}
				removeRef={(node) => {
					if (node) removeRefs.set(item.id, node);
					else removeRefs.delete(item.id);
				}}
			/>
		{/each}
	</ul>
{/snippet}
<!-- svelte-ignore a11y_no_static_element_interactions (Hover/focus only arms document paste; the native button is the interactive control.) -->
<div
	class="arc-file-dropzone__wrapper"
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => (hovered = false)}
	onfocusin={() => (focusWithin = true)}
	onfocusout={(event) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focusWithin = false;
	}}
>
	<!-- svelte-ignore a11y_no_static_element_interactions (File drag events complement the native picker button.) -->
	<div
		bind:this={zone}
		class={[
			'arc-file-dropzone__dropzone',
			dragging && 'arc-file-dropzone__dragging',
			inside && 'arc-file-dropzone__inside',
			compact && 'arc-file-dropzone__compact'
		]}
		ondragenter={(event) => {
			if (!carriesFiles(event)) return;
			event.preventDefault();
			if (!dragDepth) track(event);
			dragDepth++;
			dragging = true;
		}}
		ondragover={(event) => {
			if (!carriesFiles(event)) return;
			event.preventDefault();
			event.dataTransfer!.dropEffect = 'copy';
			track(event);
		}}
		ondragleave={(event) => {
			if (!carriesFiles(event)) return;
			dragDepth = Math.max(0, dragDepth - 1);
			if (!dragDepth) dragging = false;
		}}
		ondrop={(event) => {
			event.preventDefault();
			dragDepth = 0;
			dragging = false;
			if (event.dataTransfer?.files.length) addFiles(event.dataTransfer.files);
		}}
	>
		<span
			class="arc-file-dropzone__wash"
			style:background-image={`radial-gradient(260px circle at ${glowX.current}% ${glowY.current}%, color-mix(in oklab, var(--accent) 6%, transparent), transparent 70%)`}
			aria-hidden="true"
		></span>
		<svg class="arc-file-dropzone__edge" aria-hidden="true"
			><rect width="100%" height="100%" rx={33.5} pathLength={1358} {@attach fitEdge} /></svg
		>
		<span
			class="arc-file-dropzone__glow"
			style:background-image={`radial-gradient(180px circle at ${glowX.current}% ${glowY.current}%, var(--accent), transparent 70%)`}
			aria-hidden="true"
		></span>
		<button
			bind:this={trigger}
			type="button"
			class="arc-file-dropzone__trigger"
			onclick={() => input?.click()}
			aria-describedby={compact ? descriptionId : `${descriptionId} ${noteId}`}
			style:padding-top={`${top.current}px`}
			style:padding-bottom={`${bottom.current}px`}
		>
			{#if !compact || dragging}<span
					class="arc-file-dropzone__iconSlot"
					in:heightPresence={{
						reduced,
						reducedDuration: m.duration.instant,
						skip: !mounted.current,
						fade: enterFade
					}}
					out:heightPresence={{ reduced, reducedDuration: m.duration.instant, spring: collapse }}
				>
					<span class="arc-file-dropzone__sheets" aria-hidden="true"
						><span class="arc-file-dropzone__sheet" data-sheet="back"></span><span
							class="arc-file-dropzone__sheet"
							data-sheet="side"
						></span><span class="arc-file-dropzone__sheet" data-sheet="front"
							><ArrowUp size={14} strokeWidth={2} /></span
						></span
					>
				</span>{/if}
			<strong class="arc-file-dropzone__label"
				>{#key dragging ? dropCopy : label}<span
						class="arc-file-dropzone__labelText"
						in:swap={motion.textIn}
						out:swap={motion.textOut}>{dragging ? dropCopy : label}</span
					>{/key}</strong
			>
			<span id={descriptionId} class="arc-file-dropzone__hint">{description}</span>
			{#if !compact}<span
					class="arc-file-dropzone__noteSlot"
					in:heightPresence={{
						reduced,
						reducedDuration: m.duration.instant,
						skip: !mounted.current,
						fade: enterFade
					}}
					out:heightPresence={{ reduced, reducedDuration: m.duration.instant, spring: collapse }}
					><small id={noteId} class="arc-file-dropzone__note">{noteCopy}</small></span
				>{/if}
		</button>
		{#if inside}{@render list()}{/if}
	</div>
	<input
		bind:this={input}
		class="arc-file-dropzone__input"
		type="file"
		{accept}
		{multiple}
		tabindex={-1}
		aria-hidden="true"
		onchange={(event) => {
			if (event.currentTarget.files) addFiles(event.currentTarget.files);
			event.currentTarget.value = '';
		}}
	/>
	{#if error}<ErrorRow text={error} {reduced} present={() => !!error} />{/if}
	{#if !inside}{@render list()}{/if}
	<span class="arc-file-dropzone__srOnly" role="status" aria-live="polite">{announcement}</span>
</div>
