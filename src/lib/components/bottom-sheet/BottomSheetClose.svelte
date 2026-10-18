<script lang="ts">
	import { Dialog } from 'bits-ui';
	let { ref = $bindable(null), ...props }: Dialog.CloseProps = $props();
</script>

<Dialog.Close {...props} bind:ref />
