<script lang="ts">
	import { Slider } from '#arc/slider';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Volume1 from '@lucide/svelte/icons/volume-1';
	import VolumeX from '@lucide/svelte/icons/volume-x';
	import { motionTokens as m, swap, Mounted } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	import './slider-demo.css';
	const quotes = [
		1400, 1850, 2200, 2400, 2650, 2900, 3100, 3300, 3450, 3700, 3900, 4200, 4400, 4600, 4750, 5100,
		5400, 5600, 5900, 6300, 6500, 6800, 7200, 7400, 7900, 8300, 8600, 9100, 9400, 9800, 10500, 11800
	];
	let budget = $state<[number, number]>([2000, 8000]),
		volume = $state(60),
		saved = 60;
	const matches = $derived(quotes.filter((v) => v >= budget[0] && v <= budget[1]).length);
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	const Icon = $derived(volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2);
	const marks = [0, 25, 50, 75, 100].map((value) => ({ value, label: `${value}%` }));
	let previous = $state(23),
		direction = $state(1);
	$effect.pre(() => {
		if (matches !== previous) {
			direction = matches > previous ? 1 : -1;
			previous = matches;
		}
	});
</script>

<div class="arc-slider-demo__frame">
	<div class="arc-slider-demo__demo">
		<section class="arc-slider-demo__section">
			<Slider
				label="Budget"
				value={budget}
				onValueChange={(v) => (budget = v)}
				min={0}
				max={10000}
				step={100}
				minStepsBetweenThumbs={5}
				format={(v) => `$${v.toLocaleString('en-US')}`}
				thumbLabels={['Minimum budget', 'Maximum budget']}
			/>
			<p class="arc-slider-demo__result">
				<span aria-hidden="true"
					><span class="arc-slider-demo__count"
						>{#key matches}<span
								class="arc-slider-demo__countValue"
								in:swap={reduced
									? { duration: m.duration.instant, skip: !mounted.current }
									: {
											y: `${direction * 0.3}em`,
											blur: m.blur.soft,
											duration: m.duration.standard,
											easing: m.ease.enter,
											skip: !mounted.current
										}}
								out:swap={reduced
									? { duration: m.duration.instant, pop: true }
									: {
											y: `${direction * -0.3}em`,
											blur: m.blur.subtle,
											duration: m.duration.exit,
											easing: m.ease.standard,
											pop: true
										}}>{matches}</span
							>{/key}</span
					>
					of {quotes.length} shortlisted studios quote in this range</span
				><span class="arc-slider-demo__srOnly" aria-live="polite" aria-atomic="true"
					>{matches} of {quotes.length} shortlisted studios quote in this range</span
				>
			</p>
		</section>
		<section class="arc-slider-demo__section">
			<Slider
				label="Volume"
				value={volume}
				onValueChange={(v) => (volume = v)}
				step={5}
				{marks}
				format={(v) => `${v}%`}
			>
				{#snippet start()}<button
						type="button"
						class="arc-slider-demo__mute"
						aria-label="Mute"
						aria-pressed={volume === 0}
						onclick={() => {
							if (volume === 0) volume = saved || 50;
							else {
								saved = volume;
								volume = 0;
							}
						}}
						>{#key Icon}<span
								class="arc-slider-demo__icon"
								in:swap={reduced
									? { duration: m.duration.instant, skip: !mounted.current }
									: { scale: 0.6, blur: 3, ...m.spring.snappy, skip: !mounted.current }}
								out:swap={reduced
									? { duration: m.duration.instant, pop: true }
									: {
											scale: 0.6,
											blur: 3,
											duration: m.duration.instant,
											easing: m.ease.standard,
											pop: true
										}}><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span
							>{/key}</button
					>{/snippet}
			</Slider>
		</section>
	</div>
</div>
