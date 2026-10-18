<script lang="ts">
	import { Dialog as Primitive } from 'bits-ui';
	import type { DialogProps } from './types';

	let { open = $bindable(false), ...props }: DialogProps = $props();
</script>

<Primitive.Root bind:open {...props} />
