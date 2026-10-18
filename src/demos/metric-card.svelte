<script lang="ts">
	import { MetricCard } from '#arc/metric-card';
	import { SegmentedControl } from '#arc/segmented-control';
	import './demo.css';
	import './metric-card-demo.css';
	let range = $state<'7D' | '30D' | '90D'>('7D');
	const metrics = {
		'7D': {
			label: 'Weekly active users',
			value: 2486,
			change: '+18.4%',
			context: 'Compared with the last 7 days'
		},
		'30D': {
			label: 'Monthly active users',
			value: 9312,
			change: '+6.2%',
			context: 'Compared with the last 30 days'
		},
		'90D': {
			label: 'Quarterly active users',
			value: 21870,
			change: '−2.1%',
			context: 'Compared with the last 90 days'
		}
	};
</script>

<div class="demo-canvas">
	<div class="demo-metric-card">
		<MetricCard {...metrics[range]} />
		<SegmentedControl
			label="Metric range"
			value={range}
			onValueChange={(next) => (range = next as typeof range)}
			options={['7D', '30D', '90D'].map((value) => ({ value, label: value }))}
		/>
	</div>
</div>
