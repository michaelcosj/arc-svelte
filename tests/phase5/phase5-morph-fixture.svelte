<script>
	import { ConfirmMorph } from '#arc/confirm-morph';
	import { MoneyInput } from '#arc/money-input';
	import { PhoneInput } from '#arc/phone-input';
	import { RichTextEditor } from '#arc/rich-text-editor';
	import '../../src/lib/foundation.css';
	import '../../src/app.css';
	import '@fontsource-variable/inter';
	const kind = new URLSearchParams(location.search).get('kind');
	let state = $state('idle'),
		amount = $state(125000);
	window.morph = { state: (v) => (state = v), amount: (v) => (amount = v) };
</script>

<main style="margin:40px;width:450px">
	{#if kind === 'confirm'}<ConfirmMorph
			label="Delete workspace"
			{state}
			onStateChange={(v) => (state = v)}
			confirmTimeout={0}
			resultTimeout={0}
		/>
	{:else if kind === 'money'}<div style="width:260px">
			<MoneyInput label="Amount" value={amount} onValueChange={(v) => (amount = v)} />
		</div>
	{:else if kind === 'phone'}<PhoneInput label="Phone" defaultValue="+12015550123" />
	{:else}<RichTextEditor aria-label="Editor" defaultValue="<p>Alpha beta gamma delta.</p>" />{/if}
</main>
