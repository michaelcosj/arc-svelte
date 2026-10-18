<script lang="ts">
	import { Slider } from 'bits-ui';
	import { untrack } from 'svelte';
	import { PhysicalSpring } from '#lib/motion';
	let {
		label,
		value,
		valueText,
		max,
		onChange,
		class: className,
		reduced,
		fill,
		onActive,
		active
	}: {
		label: string;
		value: number;
		valueText: string;
		max: number;
		onChange: (v: number) => void;
		class?: string;
		reduced: boolean;
		fill: string;
		onActive: (v: boolean) => void;
		active: boolean;
	} = $props();
	const x = new PhysicalSpring(
			untrack(() => value / max),
			{ visualDuration: 0.26, bounce: 0.22 },
			{ delta: 0.0005, speed: 0.005 }
		),
		steps = $derived(
			[...Array.from({ length: max + 1 }, (_, i) => i), value].sort((a, b) => a - b)
		);
	$effect(() => {
		const target = value / max;
		untrack(() => {
			if (reduced) x.jump(target);
			else
				x.set(target, {
					spec: active ? { visualDuration: 0.1, bounce: 0 } : { visualDuration: 0.26, bounce: 0.22 }
				});
		});
	});
	let pointer: number | null = null;
	function read(e: PointerEvent) {
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		onChange(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * max);
	}
	function key(e: KeyboardEvent) {
		const n = e.shiftKey ? 10 : 1;
		const steps: Record<string, number> = {
			ArrowRight: n,
			ArrowUp: n,
			ArrowLeft: -n,
			ArrowDown: -n,
			PageUp: 10,
			PageDown: -10
		};
		if (e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			onChange(e.key === 'Home' ? 0 : max);
			return;
		}
		const step = steps[e.key];
		if (step) {
			e.preventDefault();
			onChange(Math.min(max, Math.max(0, value + step)));
		}
	}
</script>

<Slider.Root type="single" {value} min={0} {max} step={steps}
	>{#snippet child({ props })}<div
			{...props}
			class={['arc-color-picker__slider', className]}
			onpointerdown={(e) => {
				if (e.button !== 0 || pointer !== null) return;
				pointer = e.pointerId;
				e.currentTarget.setPointerCapture(e.pointerId);
				onActive(true);
				read(e);
			}}
			onpointermove={(e) => {
				if (e.pointerId === pointer) read(e);
			}}
			onpointerup={() => {
				pointer = null;
				onActive(false);
			}}
			onpointercancel={() => {
				pointer = null;
				onActive(false);
			}}
		>
			<Slider.Thumb index={0}
				>{#snippet child({ props: thumbProps })}<div
						{...thumbProps}
						class="arc-color-picker__slider-thumb"
						aria-label={label}
						aria-valuetext={valueText}
						aria-valuenow={Math.round(value)}
						style={`position:absolute;top:50%;left:${x.current * 100}%;--thumb-fill:${fill};`}
						data-active={active || undefined}
						onkeydown={key}
					></div>{/snippet}</Slider.Thumb
			>
		</div>{/snippet}</Slider.Root
>
