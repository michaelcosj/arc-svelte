<script lang="ts">
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import X from '@lucide/svelte/icons/x';
	import {
		Mounted,
		UploadProgress,
		heightPresence,
		widthPresence,
		swap,
		motionTokens as m,
		easeInOut
	} from '#lib/motion';
	import { formatSize } from '#lib/files.ts';
	import type { FileDropzoneItem } from './types';
	import { copyMotion, collapse, rowIn, shake } from './motion';
	import Thumb from './Thumb.svelte';
	import DrawnCheck from './DrawnCheck.svelte';
	let {
		item,
		reduced,
		delay,
		fresh,
		canRetry,
		onRemove,
		onRetry,
		removeRef,
		present
	}: {
		item: FileDropzoneItem;
		reduced: boolean;
		delay: number;
		fresh: boolean;
		canRetry: boolean;
		onRemove: () => void;
		onRetry: () => void;
		removeRef: (node: HTMLButtonElement | null) => void;
		present: () => boolean;
	} = $props();
	const mounted = new Mounted();
	const motion = $derived(copyMotion(reduced, mounted.current));
	const progress = new UploadProgress(() => ({
		status: item.status,
		progress: item.status === 'uploaded' ? 100 : item.progress,
		reduced,
		complete: 'uploaded',
		activeOnly: true
	}));
	const phase = $derived(progress.phase);
	const retry = $derived(item.status === 'failed' && canRetry && item.retryable !== false);
	const target = $derived(
		Math.round(Math.min(Math.max(item.status === 'uploaded' ? 100 : (item.progress ?? 0), 0), 100))
	);
	let row = $state<HTMLDivElement>();
	let shakenFor = untrack(() => (fresh ? 'new' : item.status));
	$effect(() => {
		const status = item.status;
		if (status === shakenFor) return;
		const previous = shakenFor;
		shakenFor = status;
		if (status !== 'failed' || reduced || !row) return;
		const animation = shake(row, previous === 'new' ? delay + 300 : 0);
		return () => animation.cancel();
	});
	const removeAttachment: Attachment<HTMLButtonElement> = (node) => {
		removeRef(node);
		return () => removeRef(null);
	};
</script>

<li
	class="arc-file-dropzone__item"
	in:heightPresence|global={{
		reduced,
		reducedDuration: m.duration.instant,
		skip: !fresh,
		opacity: reduced,
		delay
	}}
	out:heightPresence|global={{
		skip: present(),
		reduced,
		reducedDuration: m.duration.instant,
		spring: collapse,
		fade: { duration: m.duration.fast, easing: m.ease.standard, delay: 40 }
	}}
>
	<div
		bind:this={row}
		class={['arc-file-dropzone__row', item.status === 'failed' && 'arc-file-dropzone__isFailed']}
		in:rowIn|global={{ skip: !fresh || reduced, delay }}
		out:swap|global={{
			skip: reduced || present(),
			scale: 0.97,
			blur: m.blur.subtle,
			opacity: 1,
			duration: m.duration.fast,
			easing: m.ease.standard
		}}
	>
		<Thumb {item} />
		<span class="arc-file-dropzone__copy">
			<span class="arc-file-dropzone__name" title={item.name}>{item.name}</span>
			<span class="arc-file-dropzone__meta"
				><span>{formatSize(item.size)}</span>
				{#if phase}<span class="arc-file-dropzone__dot" aria-hidden="true">·</span><span
						class="arc-file-dropzone__phase"
					>
						{#each [phase] as shown (shown)}<span
								class={[
									'arc-file-dropzone__state',
									shown === 'uploaded' && 'arc-file-dropzone__uploaded',
									shown === 'failed' && 'arc-file-dropzone__failed'
								]}
								in:swap={motion.textIn}
								out:swap={motion.textOut}
							>
								{#if shown === 'uploading'}<span
										>Uploading <span class="arc-file-dropzone__percent">{progress.percent}%</span
										></span
									>
								{:else if shown === 'uploaded'}<DrawnCheck
										animate={!reduced && (mounted.current || fresh)}
									/><span>Uploaded</span>
								{:else}<CircleAlert
										class="arc-file-dropzone__stateIcon"
										size={14}
										strokeWidth={2.25}
										aria-hidden="true"
									/><span class="arc-file-dropzone__reason" title={item.error}
										><span class="arc-file-dropzone__srOnly">Failed: </span>{item.error ||
											'Upload failed'}</span
									>{/if}
							</span>{/each}
					</span>{/if}
			</span>
			{#if phase === 'uploading'}<span
					class="arc-file-dropzone__barFrame"
					in:heightPresence={{
						reduced,
						reducedDuration: m.duration.instant,
						skip: !mounted.current
					}}
					out:heightPresence={{
						reduced,
						reducedDuration: m.duration.instant,
						heightDelay: 220,
						spring: collapse,
						fade: { duration: m.duration.fast, delay: 160, easing: m.ease.standard }
					}}
				>
					<span
						class="arc-file-dropzone__bar"
						role="progressbar"
						aria-label={`Uploading ${item.name}`}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={target}
					>
						<span
							class="arc-file-dropzone__barFill"
							style:transform={`translateX(${progress.value - 100}%)`}
						></span>
					</span>
				</span>{/if}
		</span>
		<span class="arc-file-dropzone__actions">
			{#if retry}<span
					class="arc-file-dropzone__retrySlot"
					in:widthPresence={{
						skip: !mounted.current,
						spring: reduced ? { duration: m.duration.instant, easing: () => 1 } : m.spring.smooth,
						fade: {
							duration: reduced ? m.duration.instant : m.duration.standard,
							easing: reduced ? easeInOut : m.ease.enter
						}
					}}
					out:widthPresence={{
						spring: reduced ? { duration: m.duration.instant, easing: () => 0 } : collapse,
						fade: { duration: m.duration.instant, easing: easeInOut }
					}}
				>
					<span
						class="arc-file-dropzone__retryInner"
						in:swap={{
							skip: !mounted.current || reduced,
							scale: 0.8,
							blur: m.blur.subtle,
							opacity: 1,
							...m.spring.snappy
						}}
					>
						<button
							type="button"
							class="arc-file-dropzone__retry"
							onclick={onRetry}
							aria-label={`Retry ${item.name}`}
							title="Retry"
							><RotateCw size={14} strokeWidth={2} aria-hidden="true" /><span
								class="arc-file-dropzone__retryLabel">Retry</span
							></button
						>
					</span>
				</span>{/if}
			<button
				type="button"
				class="arc-file-dropzone__remove"
				onclick={onRemove}
				aria-label={`Remove ${item.name}`}
				title="Remove"
				{@attach removeAttachment}><X size={16} strokeWidth={1.75} aria-hidden="true" /></button
			>
		</span>
	</div>
</li>
