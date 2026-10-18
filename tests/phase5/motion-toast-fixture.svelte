<script>
	import {
		ToastStackProvider,
		ToastStack,
		useToastStack
	} from '../../src/lib/components/toast-stack';
	function expose() {
		window.api = useToastStack();
	}
</script>

{#snippet consumer()}{@const unused = expose()}<ToastStack label="Fixture" contained />{/snippet}
<div style="position:relative;width:358px;height:500px">
	<ToastStackProvider children={consumer} />
</div>
