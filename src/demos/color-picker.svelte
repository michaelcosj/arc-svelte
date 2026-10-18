<script lang="ts">
	import { ColorPicker } from '#arc/color-picker';
	const swatches = [
		{ id: 'cobalt', color: '#2F6BFF' },
		{ id: 'tomato', color: '#E5484D' },
		{ id: 'moss', color: '#2E7D4F' },
		{ id: 'saffron', color: '#F5B83D' },
		{ id: 'plum', color: '#7B4BD1' }
	];
</script>

<div class="canvas">
	<div class="demo">
		<div class="anchor">
			<ColorPicker label="Accent" defaultValue="#2F6BFF" defaultSwatches={swatches} />
		</div>
	</div>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 760px;
		margin-inline: auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.canvas > * {
		width: 100%;
		min-width: 0;
	}
	.demo {
		display: grid;
		width: 100%;
		min-height: 460px;
		place-items: start center;
		padding-top: 8px;
	}
	.anchor {
		display: flex;
		width: min(19rem, calc(100vw - 32px));
		max-width: 100%;
	}
</style>
