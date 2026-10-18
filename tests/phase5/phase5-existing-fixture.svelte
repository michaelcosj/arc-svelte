<script lang="ts">
	import { Slider } from '#arc/slider';
	import { NumberField } from '#arc/number-field';
	import { HoldToConfirm } from '#arc/hold-to-confirm';
	import { ElasticSlider } from '#arc/elastic-slider';
	const query = new URLSearchParams(location.search),
		kind = query.get('kind') ?? 'slider';
	let props = $state<Record<string, unknown>>(JSON.parse(query.get('props') ?? '{}')),
		shown = $state(true),
		events = $state<unknown[]>([]);
	function record(type: string, value?: unknown) {
		events.push([type, value ?? null]);
		if (type === 'confirm' && props.unmountInConfirm) shown = false;
		if (type === 'confirm' && props.promiseReject)
			return Promise.reject(new Error('fixture rejection'));
		if (type === 'confirm' && props.promise)
			return new Promise<void>((resolve) =>
				setTimeout(() => {
					record('promise-settled');
					resolve();
				}, 500)
			);
	}
	$effect(() => {
		Object.assign(window, {
			api: {
				set: (patch: Record<string, unknown>) => Object.assign(props, patch),
				events: () => JSON.parse(JSON.stringify(events)),
				unmount: () => (shown = false)
			}
		});
	});
</script>

<main id="fixture" style="padding:40px;width:min(540px,100%);box-sizing:border-box">
	{#if shown}
		{#if kind === 'number'}<NumberField label="Number" defaultValue={40} {...props} />
		{:else if kind === 'standard'}<Slider label="Slider" defaultValue={40} {...props} />
		{:else if kind === 'hold'}<HoldToConfirm
				label="Hold action"
				duration={240}
				{...props}
				onConfirm={() => record('confirm')}
				onHoldChange={(v) => record('holding', v)}
			/>
		{:else}<form id="form">
				<ElasticSlider
					label="Slider"
					defaultValue={40}
					{...props}
					onValueChange={(v) => record('change', v)}
					onValueCommit={(v) => record('commit', v)}
				/>
			</form>{/if}
	{/if}
	<button id="outside" type="button" style="margin-top:60px">Outside</button><output id="events"
		>{JSON.stringify(events)}</output
	>
</main>
