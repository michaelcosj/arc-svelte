<script lang="ts">
	import File from '@lucide/svelte/icons/file';
	import FileArchive from '@lucide/svelte/icons/file-archive';
	import FileImage from '@lucide/svelte/icons/file-image';
	import FileText from '@lucide/svelte/icons/file-text';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import X from '@lucide/svelte/icons/x';
	import {
		Mounted,
		UploadProgress,
		contentSwap,
		heightPresence,
		motionTokens as m,
		swap
	} from '#lib/motion';
	import type { Attachment } from 'svelte/attachments';
	import type { FileUploadItem, Upload } from './types';
	import { formatSize } from './files';
	let {
		item,
		upload,
		reduced,
		onRemove,
		onRetry,
		removeRef
	}: {
		item: FileUploadItem;
		upload?: Upload;
		reduced: boolean;
		onRemove: () => void;
		onRetry: () => void;
		removeRef: (node: HTMLButtonElement | null) => void;
	} = $props();
	const mounted = new Mounted();
	const motion = $derived(contentSwap(reduced, mounted.current));
	const status = $derived(upload?.status);
	const progress = new UploadProgress(() => ({ status, progress: upload?.progress, reduced }));
	const shownStatus = $derived(progress.phase);
	const phase = $derived(item.error ? 'invalid' : (shownStatus ?? 'ready'));
	const percent = $derived(progress.percent);
	const Icon = $derived(
		item.file.type.startsWith('image/')
			? FileImage
			: item.file.type.startsWith('text/')
				? FileText
				: item.file.type.includes('zip') || item.file.name.endsWith('.gz')
					? FileArchive
					: File
	);
	const removeAttachment: Attachment<HTMLButtonElement> = (node) => {
		removeRef(node);
		return () => removeRef(null);
	};
</script>

<div class="arc-file-upload__file-item">
	<span class="arc-file-upload__file-icon"
		><Icon size={16} strokeWidth={1.8} aria-hidden="true" /></span
	>
	<span class="arc-file-upload__file-copy">
		<strong title={item.file.name}>{item.file.name}</strong>
		<span class="arc-file-upload__meta"
			>{formatSize(item.file.size)}{#if shownStatus}<span
					class="arc-file-upload__dot"
					aria-hidden="true">·</span
				><span class="arc-file-upload__phase"
					>{#key shownStatus}<span
							class={[
								'arc-file-upload__phase-text',
								shownStatus === 'failed' && 'arc-file-upload__error'
							]}
							in:swap={{ ...motion.textIn, duration: reduced ? 0 : m.duration.standard }}
							out:swap={motion.textOut}
							>{#if shownStatus === 'uploading'}Uploading <span class="arc-file-upload__percent"
									>{percent}%</span
								>{:else if shownStatus === 'done'}Uploaded{:else}Upload failed{/if}</span
						>{/key}</span
				>{/if}</span
		>
		{#if item.error}<span class="arc-file-upload__error">{item.error}</span>{/if}
		{#if shownStatus === 'uploading'}<span
				class="arc-file-upload__bar-frame"
				in:heightPresence={{ reduced, skip: !mounted.current }}
				out:heightPresence={{
					reduced,
					reducedDuration: m.duration.instant,
					delay: m.duration.standard
				}}
				><span class="arc-file-upload__bar"
					><span
						class="arc-file-upload__bar-fill"
						style:transform={`translateX(${progress.value - 100}%)`}
					></span></span
				></span
			>{/if}
	</span>
	<span class="arc-file-upload__status-slot">
		{#each phase === 'ready' || phase === 'done' ? ['ready'] : phase === 'failed' ? ['retry'] : [] as statusIcon (statusIcon)}
			{#if statusIcon === 'ready'}<span
					class="arc-file-upload__ready"
					in:swap|global={{
						scale: reduced ? 1 : 0.8,
						...m.spring.snappy,
						duration: reduced ? 0 : m.spring.snappy.duration,
						skip: !mounted.current
					}}
					out:swap|global={{ duration: m.duration.instant, pop: true }}
					><svg
						width={14}
						height={14}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width={2}
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
						><path class="arc-file-upload__check" pathLength="1" d="M4 12.5l5 5L20 6.5" /></svg
					><span class="arc-file-upload__sr-only">{phase === 'done' ? 'Uploaded' : 'Ready'}</span
					></span
				>
			{:else}<span
					class="arc-file-upload__retry-slot"
					in:swap|global={{ ...motion.iconIn, duration: reduced ? 0 : m.spring.snappy.duration }}
					out:swap|global={motion.iconOut}
					><button
						type="button"
						class="arc-file-upload__retry"
						aria-label={`Retry ${item.file.name}`}
						onclick={onRetry}><RotateCw size={14} strokeWidth={1.8} aria-hidden="true" /></button
					></span
				>{/if}
		{/each}
	</span>
	<button
		type="button"
		class="arc-file-upload__remove"
		aria-label={`Remove ${item.file.name}`}
		onclick={onRemove}
		{@attach removeAttachment}><X size={15} aria-hidden="true" /></button
	>
</div>
