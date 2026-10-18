<script lang="ts">
	import { TreeView } from '#arc/tree-view';
</script>

<div class="canvas" data-canvas="top">
	<div class="tree-frame">
		<TreeView
			aria-label="Project files"
			defaultExpandedIds={['src', 'components']}
			nodes={[
				{
					id: 'src',
					label: 'src',
					children: [
						{
							id: 'components',
							label: 'components',
							children: [
								{ id: 'button', label: 'button.tsx' },
								{ id: 'button-styles', label: 'button.module.css' }
							]
						},
						{ id: 'page', label: 'page.tsx' }
					]
				},
				{ id: 'readme', label: 'README.md' }
			]}
		/>
	</div>
</div>

<style>
	.tree-frame {
		width: 100%;
		max-width: 390px;
	}
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 580px;
		min-height: 88px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
</style>
