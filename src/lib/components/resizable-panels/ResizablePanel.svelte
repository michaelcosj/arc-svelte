<script lang="ts">
	import type { ResizablePanelProps } from './types';
	let { children }: ResizablePanelProps = $props();
</script>

{@render children?.()}
