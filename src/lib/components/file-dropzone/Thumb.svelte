<script lang="ts">
	import File from '@lucide/svelte/icons/file';
	import FileImage from '@lucide/svelte/icons/file-image';
	import FilePlay from '@lucide/svelte/icons/file-play';
	import FileArchive from '@lucide/svelte/icons/file-archive';
	import FileText from '@lucide/svelte/icons/file-text';
	import type { FileDropzoneItem } from './types';
	let { item }: { item: FileDropzoneItem } = $props();
	let broken = $state(false);
	const extension = $derived(item.name.toLowerCase().split('.').pop() ?? '');
	const Icon = $derived(
		['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic'].includes(extension)
			? FileImage
			: ['mov', 'mp4', 'webm', 'm4v', 'avi'].includes(extension)
				? FilePlay
				: ['zip', 'gz', 'tar', 'rar', '7z'].includes(extension)
					? FileArchive
					: ['pdf', 'md', 'txt', 'doc', 'docx', 'rtf'].includes(extension)
						? FileText
						: File
	);
</script>

{#if item.preview && !broken}
	<span class="arc-file-dropzone__thumb"
		><img
			src={item.preview}
			alt=""
			width={40}
			height={40}
			decoding="async"
			onerror={() => (broken = true)}
		/></span
	>
{:else}
	<span class="arc-file-dropzone__fileIcon"
		><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span
	>
{/if}
