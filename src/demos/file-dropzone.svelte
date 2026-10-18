<script lang="ts">
	import { FileDropzone, type FileDropzoneItem } from '#arc/file-dropzone';
	import { simulateUpload } from './lib/upload';
	import './actions.css';
	const items: FileDropzoneItem[] = [
		{
			id: 'hero-shot',
			name: 'lounge-chair-hero.jpg',
			size: 1887436.8,
			status: 'uploaded',
			preview: '/media/photos/lounge-chair.jpg'
		},
		{ id: 'brand-guidelines', name: 'brand-guidelines.pdf', size: 2516582.4, status: 'uploaded' },
		{
			id: 'launch-video',
			name: 'launch-video.mov',
			size: 9017753.6,
			status: 'failed',
			error: 'Connection lost'
		}
	];
</script>

<div class="actions-preview actions-roomy">
	<div class="actions-surface">
		<FileDropzone
			label="Add launch assets"
			description="Drop, paste, or choose files from your device"
			note="PDF, images, or video up to 10 MB."
			accept="image/*,video/*,.pdf"
			maxSize={10485760}
			maxFiles={6}
			compactAt={5}
			defaultItems={items}
			onUpload={simulateUpload}
		/>
	</div>
	<div class="actions-status" role="status"></div>
</div>
