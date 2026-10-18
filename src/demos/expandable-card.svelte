<script lang="ts">
	import { ExpandableCard } from '#arc/expandable-card';
</script>

<div class="preview">
	<ExpandableCard
		title="Launch checklist"
		description="4 of 6 items complete"
		width={400}
		expandedWidth={600}
		data-frame-keep=""
		><div class="copy">
			<strong>Two small steps remain</strong><span
				>Invite reviewers and add a release note before publishing.</span
			>
			<ul class="steps">
				<li><span>Invite reviewers</span><span>Maya Chen, Jonas Weber</span></li>
				<li><span>Add a release note</span><span>Draft started Tuesday</span></li>
			</ul>
		</div></ExpandableCard
	>
</div>

<style>
	.preview {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		width: 100%;
		max-width: 720px;
		min-width: 0;
		min-height: 248px;
		margin-inline: auto;
		align-content: start;
		justify-items: stretch;
		gap: 14px;
		color: var(--foreground);
	}
	.preview > * {
		max-width: 100%;
	}
	.copy {
		display: grid;
		gap: 4px;
	}
	.copy strong {
		color: var(--foreground);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.copy span {
		color: var(--text-secondary);
		font-size: var(--text-xs);
		line-height: 1.4;
	}
	.steps {
		display: grid;
		gap: 0;
		margin: 8px 0 0;
		padding: 0;
		list-style: none;
	}
	.steps li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 0;
		border-top: 1px solid var(--border-subtle);
		font-size: var(--text-xs);
	}
	.steps li span:first-child {
		color: var(--foreground);
	}
	.steps li span:last-child {
		color: var(--text-muted);
		text-align: right;
	}
</style>
