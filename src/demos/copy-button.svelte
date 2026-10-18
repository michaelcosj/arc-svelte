<script lang="ts">
	import { CopyButton } from '#arc/copy-button';
	import './actions.css';
</script>

<div class="actions-preview">
	<div class="actions-surface">
		<div class="actions-copy">
			<div class="actions-copy-field">
				<span class="actions-copy-label">Share link</span>
				<div class="actions-copy-value">
					<code>example.com/launch</code>
					<CopyButton value="https://example.com/launch" label="Copy link" />
				</div>
			</div>
			<div class="actions-copy-row">
				<span>Invite code</span>
				<code>ARC-4821</code>
				<CopyButton value="ARC-4821" label="Copy invite code" iconOnly variant="plain" />
			</div>
		</div>
	</div>
	<div class="actions-status" role="status"></div>
</div>
