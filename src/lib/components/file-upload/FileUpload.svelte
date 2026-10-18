<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import UploadCloud from '@lucide/svelte/icons/cloud-upload';
	import {
		HeightMorph,
		Mounted,
		contentSwap,
		motionTokens as m,
		swap,
		heightPresence
	} from '#lib/motion';
	import type { FileUploadProps, FileUploadItem, Upload } from './types';
	import { formatSize, matchesAccept } from './files';
	import FileRow from './FileRow.svelte';
	import './file-upload.css';
	let {
		accept,
		disabled = false,
		label = 'Upload files',
		description = 'Drop files here or browse from your device.',
		multiple = true,
		maxSize,
		value,
		onChange,
		onUpload
	}: FileUploadProps = $props();
	const inputId = $props.id();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	const motion = $derived(contentSwap(reduced, mounted.current));
	let input = $state<HTMLInputElement>(),
		dropzone = $state<HTMLDivElement>();
	let internalFiles = $state<FileUploadItem[]>([]),
		dragging = $state(false),
		status = $state(''),
		uploads = $state<Record<string, Upload>>({});
	let dragDepth = 0,
		nextId = 0;
	const controllers = new SvelteMap<string, AbortController>();
	const removeRefs = new Map<string, HTMLButtonElement>();
	const files = $derived(value ?? internalFiles);
	$effect(() => () => controllers.forEach((c) => c.abort()));
	function update(next: FileUploadItem[]) {
		if (value === undefined) internalFiles = next;
		onChange?.(next);
	}
	function startUpload(item: FileUploadItem) {
		if (!onUpload) return;
		controllers.get(item.id)?.abort();
		const controller = new AbortController();
		controllers.set(item.id, controller);
		const set = (next: Upload) => (uploads = { ...uploads, [item.id]: next });
		set({ status: 'uploading', progress: 0 });
		onUpload(item.file, {
			signal: controller.signal,
			onProgress: (percent) => {
				if (!controller.signal.aborted)
					set({
						status: 'uploading',
						progress: Math.min(Math.max(percent, uploads[item.id]?.progress ?? 0), 100)
					});
			}
		})
			.then(
				() => {
					if (controller.signal.aborted) return;
					set({ status: 'done', progress: 100 });
					status = `${item.file.name} uploaded.`;
				},
				() => {
					if (controller.signal.aborted) return;
					set({ status: 'failed', progress: uploads[item.id]?.progress ?? 0 });
					status = `${item.file.name} could not be uploaded.`;
				}
			)
			.finally(() => {
				if (controllers.get(item.id) === controller) controllers.delete(item.id);
			});
	}
	function addFiles(list: FileList | File[]) {
		const accepted = Array.from(list)
			.slice(0, multiple ? undefined : 1)
			.map((file) => ({
				id: `${file.name}-${file.lastModified}-${nextId++}`,
				file,
				error: !matchesAccept(file, accept)
					? 'This file type is not accepted.'
					: maxSize && file.size > maxSize
						? `File is larger than ${formatSize(maxSize)}.`
						: undefined
			}));
		if (!multiple) controllers.forEach((c) => c.abort());
		update(multiple ? [...files, ...accepted] : accepted);
		const invalid = accepted.filter((item) => item.error).length,
			valid = accepted.length - invalid;
		const added = `${valid} file${valid === 1 ? '' : 's'} added.`,
			attention = `${invalid} file${invalid === 1 ? ' needs' : 's need'} attention.`;
		status = !invalid ? added : valid ? `${added} ${attention}` : attention;
		accepted.filter((item) => !item.error).forEach(startUpload);
	}
	function remove(item: FileUploadItem) {
		controllers.get(item.id)?.abort();
		controllers.delete(item.id);
		const index = files.findIndex((f) => f.id === item.id),
			neighbor = files[index + 1] ?? files[index - 1];
		update(files.filter((f) => f.id !== item.id));
		status = `${item.file.name} removed.`;
		requestAnimationFrame(() => (neighbor ? removeRefs.get(neighbor.id) : dropzone)?.focus());
	}
	function enter(event: DragEvent) {
		event.preventDefault();
		if (!disabled) {
			dragDepth++;
			dragging = true;
		}
	}
	function leave(event: DragEvent) {
		event.preventDefault();
		dragDepth = Math.max(0, dragDepth - 1);
		if (!dragDepth) dragging = false;
	}
	function drop(event: DragEvent) {
		event.preventDefault();
		dragDepth = 0;
		dragging = false;
		if (!disabled && event.dataTransfer?.files.length) addFiles(event.dataTransfer.files);
	}
	const statusHeight = new HeightMorph(() => ({ reduced, follow: true, clip: false }));
	const padding = new Tween(0);
	$effect(() => {
		void padding.set(files.length ? 6 : 0, {
			...m.spring.smooth,
			duration: reduced ? 0 : m.spring.smooth.duration
		});
	});
</script>

<div class="arc-file-upload">
	<input
		bind:this={input}
		id={inputId}
		class="arc-file-upload__input"
		type="file"
		{accept}
		{multiple}
		{disabled}
		onchange={(event) => {
			if (event.currentTarget.files) addFiles(event.currentTarget.files);
			event.currentTarget.value = '';
		}}
	/>
	<div
		bind:this={dropzone}
		class={[
			'arc-file-upload__dropzone',
			dragging && 'arc-file-upload--dragging',
			disabled && 'arc-file-upload--disabled'
		]}
		role="button"
		tabindex={disabled ? -1 : 0}
		aria-disabled={disabled}
		aria-describedby={`${inputId}-description`}
		onclick={() => !disabled && input?.click()}
		onkeydown={(event) => {
			if (!disabled && ['Enter', ' '].includes(event.key)) {
				event.preventDefault();
				input?.click();
			}
		}}
		ondragenter={enter}
		ondragover={(event) => event.preventDefault()}
		ondragleave={leave}
		ondrop={drop}
	>
		<span class="arc-file-upload__upload-icon"
			><UploadCloud size={20} strokeWidth={1.8} aria-hidden="true" /></span
		>
		<span class="arc-file-upload__copy"
			><strong class="arc-file-upload__label"
				>{#key dragging ? 'drop' : 'idle'}<span
						class="arc-file-upload__label-text"
						in:swap={{ ...motion.textIn, duration: reduced ? 0 : m.duration.standard }}
						out:swap={motion.textOut}
						>{dragging ? `Drop to add ${multiple ? 'files' : 'a file'}` : label}</span
					>{/key}</strong
			><span id={`${inputId}-description`}>{description}</span></span
		><span class="arc-file-upload__browse">Browse</span>
	</div>
	<div class="arc-file-upload__status-frame" {@attach statusHeight.body}>
		<div
			{@attach statusHeight.content}
			style:height={status ? undefined : '0px'}
			style:overflow={status ? undefined : 'hidden'}
		>
			<p class="arc-file-upload__status" aria-live="polite" aria-atomic="true">
				{#each status ? [status] : [] as message (message)}<span
						class="arc-file-upload__status-text"
						in:swap={{ ...motion.textIn, duration: reduced ? 0 : m.duration.standard }}
						out:swap={motion.textOut}>{message}</span
					>{/each}
			</p>
		</div>
	</div>
	<ul
		class="arc-file-upload__file-list"
		aria-label="Selected files"
		aria-hidden={files.length === 0 ? true : undefined}
		style:padding-top={`${padding.current}px`}
	>
		{#each files as item (item.id)}<li
				class="arc-file-upload__file-row"
				in:heightPresence={{ reduced, skip: !mounted.current }}
				out:heightPresence={{ reduced, reducedDuration: m.duration.instant }}
			>
				<FileRow
					{item}
					upload={uploads[item.id]}
					{reduced}
					onRemove={() => remove(item)}
					onRetry={() => startUpload(item)}
					removeRef={(node) => {
						if (node) removeRefs.set(item.id, node);
						else removeRefs.delete(item.id);
					}}
				/>
			</li>{/each}
	</ul>
</div>
