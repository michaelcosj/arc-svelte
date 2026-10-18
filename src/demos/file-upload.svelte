<script lang="ts">
	import { FileUpload } from '#arc/file-upload';
	import './actions.css';
	import { simulateUpload as upload } from './lib/upload';
</script>

<div class="actions-preview actions-roomy" data-canvas="pattern">
	<div class="actions-surface">
		<FileUpload
			label="Upload brief"
			description="PDF or markdown, up to 10 MB."
			accept=".pdf,.md"
			maxSize={10 * 1024 * 1024}
			multiple={false}
			onUpload={upload}
		/>
	</div>
	<div class="actions-status" role="status"></div>
</div>
