<script lang="ts">
	import { motionTokens as m, Mounted, swap, WidthMorph } from '#lib/motion';
	let { symbol, reduced }: { symbol: string; reduced: boolean } = $props();
	const mounted = new Mounted();
	const width = new WidthMorph(() => ({
		reduced,
		follow: true,
		measure: 'offset',
		pinned: true,
		spec: m.specs.morph
	}));
	$effect.pre(() => {
		void symbol;
		width.changed();
	});
</script>

<span class="arc-money-input__symbol" aria-hidden="true" {@attach width.body}
	><span class="arc-money-input__symbolSizer" {@attach width.content}>{symbol}</span
	>{#key symbol}<span
			class="arc-money-input__symbolGlyph"
			in:swap={reduced
				? { duration: m.duration.instant, skip: !mounted.current }
				: {
						y: '.4em',
						blur: m.blur.soft,
						...m.spring.snappy,
						fade: { duration: m.duration.fast },
						skip: !mounted.current
					}}
			out:swap={{ y: reduced ? 0 : '-.3em', duration: m.duration.instant, pop: true }}
			>{symbol}</span
		>{/key}</span
>
