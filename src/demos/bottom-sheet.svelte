<script lang="ts">
	import { BottomSheet } from '#arc/bottom-sheet';
	import { Button } from '#arc/button';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import './bottom-sheet-demo.css';
	let status = $state('open'),
		copy = $state('idle');
	const timers: ReturnType<typeof setTimeout>[] = [];
	$effect(() => () => timers.forEach(clearTimeout));
	const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
	const itinerary = [
		['05:50', 'Leave Rua das Flores', 'Taxi to the airport, about 25 min'],
		['07:05', 'Boarding at gate B32', 'Group 3 boards from 07:20'],
		['07:45', 'Depart Lisbon', 'Terminal 1'],
		['12:20', 'Arrive in Copenhagen', 'Terminal 3, local time'],
		['13:05', 'Metro M2 to Kongens Nytorv', '15 min, trains every 4 min'],
		['15:00', 'Check in at Hotel Sanders', '3 nights, room held under Emma Collins']
	];
	const people = [
		{ name: 'Emma Collins', photo: 'emma-collins', seat: '14C', bags: '1 checked bag' },
		{ name: 'Marcus Johnson', photo: 'marcus-johnson', seat: '14D', bags: 'Carry-on only' }
	];
</script>

<div class="arc-bottom-sheet-demo__frame">
	<div class="arc-bottom-sheet-demo__demo">
		<div class="arc-bottom-sheet-demo-wireframe__page" data-fill="parent" data-compact="true">
			<div class="arc-bottom-sheet-demo-wireframe__bar" aria-hidden="true">
				<span class="arc-bottom-sheet-demo-wireframe__pill arc-bottom-sheet-demo-wireframe__logo"
				></span><span class="arc-bottom-sheet-demo-wireframe__nav"
					>{#each [0, 1, 2] as i (i)}<span class="arc-bottom-sheet-demo-wireframe__pill"
						></span>{/each}</span
				><span class="arc-bottom-sheet-demo-wireframe__avatar"></span>
			</div>
			<div class="arc-bottom-sheet-demo-wireframe__main">
				<div class="arc-bottom-sheet-demo-wireframe__head">
					<span class="arc-bottom-sheet-demo-wireframe__headText" aria-hidden="true"
						><span
							class="arc-bottom-sheet-demo-wireframe__pill arc-bottom-sheet-demo-wireframe__title"
						></span><span
							class="arc-bottom-sheet-demo-wireframe__pill arc-bottom-sheet-demo-wireframe__sub"
						></span></span
					>
					<div class="arc-bottom-sheet-demo-wireframe__actions">
						<div class="arc-bottom-sheet-demo__controls">
							{#if status === 'done'}<Button
									variant="ghost"
									size="sm"
									onclick={() => (status = 'open')}>Reset demo</Button
								>{/if}
							<BottomSheet
								title="Lisbon to Copenhagen"
								description="Fri 24 Oct · Flight TP 754"
								detents={[0.46, 0.92]}
							>
								{#snippet trigger({ props })}<Button
										{...props}
										variant="secondary"
										class="arc-bottom-sheet-demo__trigger">View trip details</Button
									>{/snippet}
								{#snippet children()}
									<section class="arc-bottom-sheet-demo__flight" aria-label="Flight">
										<div class="arc-bottom-sheet-demo__times">
											<div><strong>07:45</strong><span>Lisbon, T1</span></div>
											<div class="arc-bottom-sheet-demo__duration">
												<span class="arc-bottom-sheet-demo__rule" aria-hidden="true"></span><span
													>3h 35m</span
												><span class="arc-bottom-sheet-demo__rule" aria-hidden="true"></span>
											</div>
											<div class="arc-bottom-sheet-demo__arrive">
												<strong>12:20</strong><span>Copenhagen, T3</span>
											</div>
										</div>
										<p class="arc-bottom-sheet-demo__onTime">
											<CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" /><span
												><strong>On time.</strong> Boarding 07:05 at gate B32.</span
											>
										</p>
									</section>
									<dl class="arc-bottom-sheet-demo__facts">
										<div>
											<dt>Seat</dt>
											<dd>14C</dd>
										</div>
										<div>
											<dt>Group</dt>
											<dd>3</dd>
										</div>
										<div>
											<dt>Bags</dt>
											<dd>1 × 23 kg</dd>
										</div>
									</dl>
									<div class="arc-bottom-sheet-demo__actions">
										<Button
											onclick={() => {
												if (status === 'open') {
													status = 'pending';
													later(() => (status = 'done'), 1100);
												}
											}}
											loading={status === 'pending'}
											variant={status === 'done' ? 'secondary' : 'primary'}
											aria-disabled={status === 'done' || undefined}
											>{#if status === 'done'}<Check
													size={16}
													strokeWidth={1.75}
													aria-hidden="true"
												/>Checked in{:else}Check in{/if}</Button
										><Button
											variant="secondary"
											onclick={async () => {
												try {
													await navigator.clipboard.writeText('K7Q2ZP');
													copy = 'copied';
												} catch {
													copy = 'failed';
												}
												later(() => (copy = 'idle'), 1800);
											}}
											>{#if copy === 'copied'}<Check
													size={16}
													strokeWidth={1.75}
													aria-hidden="true"
												/>Copied K7Q2ZP{:else if copy === 'failed'}<TriangleAlert
													size={16}
													strokeWidth={1.75}
													aria-hidden="true"
												/>Copy failed{:else}<Copy
													size={16}
													strokeWidth={1.75}
													aria-hidden="true"
												/>Copy booking code{/if}</Button
										>
									</div>
									<p class="arc-bottom-sheet-demo__srOnly" role="status">
										{status === 'pending' ? 'Checking in…' : status === 'done' ? 'Checked in.' : ''}
									</p>
									<section class="arc-bottom-sheet-demo__section">
										<h3>Itinerary</h3>
										<ol class="arc-bottom-sheet-demo__timeline">
											{#each itinerary as [time, title, detail] (time)}<li>
													<time>{time}</time>
													<div><strong>{title}</strong><span>{detail}</span></div>
												</li>{/each}
										</ol>
									</section>
									<section class="arc-bottom-sheet-demo__section">
										<h3>Travelers</h3>
										<ul class="arc-bottom-sheet-demo__people">
											{#each people as person (person.photo)}<li>
													<img
														src={`/media/people/${person.photo}.jpg`}
														alt=""
														width="36"
														height="36"
													/>
													<div>
														<strong>{person.name}</strong><span
															>Seat {person.seat} · {person.bags}</span
														>
													</div>
												</li>{/each}
										</ul>
									</section>
									<section class="arc-bottom-sheet-demo__section">
										<h3>Booking</h3>
										<dl class="arc-bottom-sheet-demo__booking">
											<div>
												<dt>Reference</dt>
												<dd>K7Q2ZP</dd>
											</div>
											<div>
												<dt>Fare</dt>
												<dd>Classic, €184.20 per person</dd>
											</div>
											<div>
												<dt>Changes</dt>
												<dd>Free until 22 Oct, 23:59</dd>
											</div>
										</dl>
									</section>
								{/snippet}</BottomSheet
							>
						</div>
					</div>
				</div>
				<div class="arc-bottom-sheet-demo-wireframe__blocks" aria-hidden="true">
					{#each [0, 1, 2, 3] as i (i)}<span
							class={[
								'arc-bottom-sheet-demo-wireframe__block',
								i === 3 && 'arc-bottom-sheet-demo-wireframe__wide'
							]}
						></span>{/each}
				</div>
			</div>
		</div>
	</div>
</div>
