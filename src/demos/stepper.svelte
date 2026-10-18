<script lang="ts">
	import { Stepper, type StepperOrientation } from '#arc/stepper';
	import { Input } from '#arc/input';
	import { Button } from '#arc/button';
	import { Avatar } from '#arc/avatar';
	import { AvatarGroup } from '#arc/avatar-group';
	import { SegmentedControl } from '#arc/segmented-control';
	import Check from '@lucide/svelte/icons/check';
	import { HeightMorph, Mounted, motionTokens as m, swap } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { Attachment } from 'svelte/attachments';
	import './stepper-demo.css';
	const id = $props.id();
	const steps = [
		{ id: 'profile', label: 'Profile', description: 'Your name and photo' },
		{ id: 'workspace', label: 'Workspace', description: 'Name and web address' },
		{ id: 'team', label: 'Team', description: 'Invite collaborators' },
		{ id: 'review', label: 'Review', description: 'Confirm and finish' }
	];
	const people = [
		{
			id: 'marcus',
			name: 'Marcus Johnson',
			first: 'Marcus',
			src: '/media/people/marcus-johnson.jpg'
		},
		{ id: 'ava', name: 'Ava Mitchell', first: 'Ava', src: '/media/people/ava-mitchell.jpg' },
		{ id: 'sofia', name: 'Sofia Ramirez', first: 'Sofia', src: '/media/people/sofia-ramirez.jpg' },
		{
			id: 'jasmine',
			name: 'Jasmine Brooks',
			first: 'Jasmine',
			src: '/media/people/jasmine-brooks.jpg'
		}
	];
	let orientation = $state<StepperOrientation>('horizontal');
	let compact = $state(false);
	let current = $state(1);
	let direction = $state(1);
	let name = $state('Emma Collins');
	let workspace = $state('');
	let invited = $state(['marcus', 'ava']);
	let countDirection = $state(1);
	let errors = $state<Record<string, string | undefined>>({});
	let input = $state<HTMLInputElement | null>(null);
	let nextButton = $state<HTMLButtonElement | null>(null);
	const mounted = new Mounted();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const done = $derived(current >= steps.length);
	const slug = $derived(
		workspace
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
	);
	const owner = $derived(name.trim() || 'Emma Collins');
	const workspaceName = $derived(workspace.trim() || 'Your workspace');
	const selected = $derived(people.filter((p) => invited.includes(p.id)));
	const names = $derived(
		selected.length < 2
			? selected.map((p) => p.first).join('')
			: `${selected
					.slice(0, -1)
					.map((p) => p.first)
					.join(', ')} and ${selected[selected.length - 1]!.first}`
	);
	const frame = new HeightMorph(() => ({
		reduced,
		window: 600,
		measure: 'offset',
		pinned: true,
		clip: false
	}));
	const stage = new HeightMorph(() => ({
		reduced,
		window: 600,
		measure: 'offset',
		pinned: true,
		clip: false
	}));
	$effect.pre(() => {
		void orientation;
		frame.changed();
	});
	$effect.pre(() => {
		void current;
		stage.changed();
	});
	const measure: Attachment<HTMLElement> = (node) => {
		const observer = new ResizeObserver(([entry]) => {
			if (entry) compact = entry.contentRect.width <= 544;
		});
		observer.observe(node);
		return () => observer.disconnect();
	};
	function go(next: number) {
		direction = next >= current ? 1 : -1;
		current = next;
	}
	function clearError(key: string) {
		if (errors[key]) errors = { ...errors, [key]: undefined };
	}
	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (done) {
			name = 'Emma Collins';
			workspace = '';
			invited = ['marcus', 'ava'];
			errors = {};
			go(0);
			return;
		}
		const key = steps[current]!.id;
		const error =
			key === 'profile' && !name.trim()
				? 'Add your name'
				: key === 'workspace' && !workspace.trim()
					? 'Add a workspace name'
					: key === 'workspace' && slug.length < 3
						? 'Use 3 or more letters'
						: undefined;
		errors = { ...errors, [key]: error };
		if (error) input?.focus();
		else go(current + 1);
	}
	function toggle(person: string) {
		countDirection = invited.includes(person) ? -1 : 1;
		invited = invited.includes(person)
			? invited.filter((p) => p !== person)
			: people.map((p) => p.id).filter((p) => p === person || invited.includes(p));
	}
</script>

<div class="demo-stepper__canvas">
	<section class="demo-stepper__demo" aria-labelledby={id} {@attach measure}>
		<header class="demo-stepper__header">
			<h3 {id} class="demo-stepper__title">Set up your workspace</h3>
			<SegmentedControl
				label="Stepper orientation"
				options={[
					{ value: 'horizontal', label: 'Horizontal' },
					{ value: 'vertical', label: 'Vertical' }
				]}
				value={orientation}
				onValueChange={(value) => (orientation = value as StepperOrientation)}
			/>
		</header>
		<div class="demo-stepper__frame" {@attach frame.body}>
			<div class="demo-stepper__frame-inner" {@attach frame.content}>
				{#key orientation}<div
						class="demo-stepper__body"
						data-orientation={orientation}
						in:swap={{
							blur: m.blur.soft,
							duration: reduced ? 0 : m.duration.standard,
							easing: m.ease.enter,
							skip: !mounted.current
						}}
						out:swap={{
							blur: m.blur.subtle,
							duration: reduced ? 0 : m.duration.fast,
							easing: m.ease.standard,
							pop: true
						}}
					>
						<Stepper
							steps={steps.map((step) => ({ ...step, error: errors[step.id] }))}
							{current}
							{orientation}
							onStepSelect={go}
							compact={orientation === 'vertical' && compact}
							label="Workspace setup"
							completeLabel="Setup complete"
						/>
						<form class="demo-stepper__panel" onsubmit={submit} novalidate>
							<div class="demo-stepper__stage" {@attach stage.body}>
								<div class="demo-stepper__stage-inner" {@attach stage.content}>
									{#key current}<div
											class="demo-stepper__pane"
											in:swap={{
												x: reduced ? 0 : 16 * direction,
												...m.spring.smooth,
												fade: { duration: reduced ? 0 : m.duration.standard, easing: m.ease.enter },
												duration: reduced ? 0 : m.spring.smooth.duration,
												skip: !mounted.current
											}}
											out:swap={{
												x: reduced ? 0 : -16 * direction,
												...m.spring.smooth,
												fade: { duration: reduced ? 0 : m.duration.fast, easing: m.ease.standard },
												duration: reduced ? 0 : m.spring.smooth.duration,
												pop: true
											}}
										>
											{#if done}<div class="demo-stepper__done">
													<p class="demo-stepper__done-title">
														<svg
															class="demo-stepper__done-icon"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width={2}
															stroke-linecap="round"
															stroke-linejoin="round"
															aria-hidden="true"
															><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5" /></svg
														>{workspaceName} is ready
													</p>
													<p class="demo-stepper__done-copy">
														{selected.length
															? `Invites are queued for ${names}.`
															: 'You can invite your team at any time.'}
													</p>
												</div>
											{:else if current === 0}<div class="demo-stepper__profile">
													<Avatar
														class="demo-stepper__photo"
														name={owner}
														src="/media/people/emma-collins.jpg"
														size="lg"
													/>
													<div class="demo-stepper__grow">
														<Input
															bind:ref={input}
															label="Full name"
															bind:value={name}
															placeholder="Your full name"
															autocomplete="name"
															error={errors.profile}
															oninput={() => clearError('profile')}
														/>
													</div>
												</div>
											{:else if current === 1}<div>
													<Input
														bind:ref={input}
														label="Workspace name"
														bind:value={workspace}
														placeholder="Northwind Studio"
														autocomplete="organization"
														aria-describedby={`${id}-url`}
														error={errors.workspace}
														oninput={() => clearError('workspace')}
													/>
													<p id={`${id}-url`} class="demo-stepper__url">
														<span class="demo-stepper__url-base">meridian.example/</span>{slug ||
															'your-workspace'}
													</p>
												</div>
											{:else if current === 2}<div>
													<p id={`${id}-people`} class="demo-stepper__field-label">
														Invite teammates
													</p>
													<div
														class="demo-stepper__people"
														role="group"
														aria-labelledby={`${id}-people`}
													>
														{#each people as person (person.id)}<button
																type="button"
																class="demo-stepper__person"
																aria-pressed={invited.includes(person.id)}
																aria-label={person.name}
																onclick={() => toggle(person.id)}
																><span class="demo-stepper__person-photo"
																	><Avatar
																		name={person.name}
																		src={person.src}
																		size="sm"
																		aria-hidden="true"
																	/>{#if invited.includes(person.id)}<span
																			class="demo-stepper__badge"
																			in:swap={{
																				scale: 0.4,
																				...m.spring.snappy,
																				skip: !mounted.current || reduced
																			}}
																			out:swap={{
																				scale: 0.4,
																				duration: reduced ? 0 : m.duration.fast,
																				easing: m.ease.standard
																			}}
																			><Check
																				size={9}
																				strokeWidth={3.25}
																				aria-hidden="true"
																			/></span
																		>{/if}</span
																><span class="demo-stepper__person-name">{person.first}</span
																></button
															>{/each}
													</div>
													<p class="demo-stepper__hint">
														<span class="demo-stepper__hint-count" aria-hidden="true"
															><span class="demo-stepper__count"
																>{#key selected.length}<span
																		in:swap={{
																			y: `${0.5 * countDirection}em`,
																			blur: m.blur.subtle,
																			...m.spring.snappy,
																			skip: !mounted.current || reduced
																		}}
																		out:swap={{
																			y: `${-0.5 * countDirection}em`,
																			blur: m.blur.subtle,
																			...m.spring.snappy,
																			pop: true
																		}}>{selected.length}</span
																	>{/key}</span
															>&nbsp;of {people.length} selected</span
														><span class="demo-stepper__sr-only" aria-live="polite"
															>{selected.length} of {people.length} selected.</span
														>
													</p>
												</div>
											{:else}<dl class="demo-stepper__summary">
													<div>
														<dt>Owner</dt>
														<dd>{owner}</dd>
													</div>
													<div>
														<dt>Workspace</dt>
														<dd>{workspaceName}</dd>
													</div>
													<div>
														<dt>Address</dt>
														<dd>
															<span class="demo-stepper__url-base">meridian.example/</span>{slug}
														</dd>
													</div>
													<div>
														<dt>Invites</dt>
														<dd>
															{#if selected.length}<span class="demo-stepper__guests"
																	><AvatarGroup
																		members={selected.map((person) => ({
																			name: person.name,
																			src: person.src
																		}))}
																		size="sm"
																		label="Invited teammates"
																	/><span class="demo-stepper__guest-names">{names}</span></span
																>{:else}No one yet{/if}
														</dd>
													</div>
												</dl>{/if}
										</div>{/key}
								</div>
							</div>
							<div class="demo-stepper__actions">
								<Button
									type="button"
									variant="secondary"
									label="Back"
									disabled={current === 0}
									onclick={() => {
										if (current <= 1) nextButton?.focus();
										go(Math.max(0, current - 1));
									}}
								/><Button
									type="submit"
									bind:ref={nextButton}
									label={done
										? 'Start over'
										: current === steps.length - 1
											? 'Finish setup'
											: 'Continue'}
								/>
							</div>
						</form>
					</div>{/key}
			</div>
		</div>
	</section>
</div>
