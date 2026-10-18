<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import {
		HeightMorph,
		MotionText,
		heightPresence,
		swap,
		motionTokens as m,
		easeInOut
	} from '#lib/motion';
	let { text, reduced, present }: { text: string; reduced: boolean; present: () => boolean } =
		$props();
	const height = new HeightMorph(() => ({ reduced, follow: true }));
</script>

<div
	class="arc-file-dropzone__messageSlot"
	in:heightPresence|global={{ reduced, fade: { duration: m.duration.fast, easing: easeInOut } }}
	out:heightPresence|global={{
		skip: present(),
		reduced,
		fade: { duration: m.duration.instant, easing: easeInOut }
	}}
>
	<div {@attach height.body}>
		<div
			{@attach height.content}
			class="arc-file-dropzone__error"
			role="alert"
			in:swap={{
				y: '.35em',
				blur: m.blur.soft,
				opacity: 1,
				duration: reduced ? 0 : m.duration.standard,
				easing: m.ease.enter
			}}
		>
			<CircleAlert
				class="arc-file-dropzone__errorIcon"
				size={14}
				strokeWidth={2.25}
				aria-hidden="true"
			/>
			<span class="arc-file-dropzone__errorCopy"
				><MotionText {text} exit={{ duration: m.duration.fast, easing: m.ease.standard }} /></span
			>
		</div>
	</div>
</div>
