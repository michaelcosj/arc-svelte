<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '#arc/tabs';
</script>

<div class="tabs-preview">
	<Tabs value="overview">
		<TabsList aria-label="Workspace views">
			<TabsTrigger value="overview">Overview</TabsTrigger>
			<TabsTrigger value="activity">Activity</TabsTrigger>
			<TabsTrigger value="settings">Settings</TabsTrigger>
		</TabsList>
		<TabsContent value="overview">
			<p class="caption">A calm summary of this workspace and its current health.</p>
		</TabsContent>
		<TabsContent value="activity">
			<p class="caption">Emma reviewed the latest changes a few minutes ago.</p>
		</TabsContent>
		<TabsContent value="settings">
			<p class="caption">Choose who can publish and receive notifications.</p>
		</TabsContent>
	</Tabs>
</div>

<style>
	.tabs-preview {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		width: 100%;
		min-width: 0;
		min-height: 118px;
		align-content: center;
		justify-items: center;
		gap: 14px;
		color: var(--foreground);
		text-align: center;
	}

	.tabs-preview > :global(*) {
		max-width: 100%;
		width: min(100%, 420px);
	}

	.caption {
		margin: 0;
		color: var(--text-secondary);
		font-size: 12px;
		line-height: 1.45;
	}

	@media (max-width: 520px) {
		.tabs-preview {
			min-height: 132px;
		}
	}
</style>
