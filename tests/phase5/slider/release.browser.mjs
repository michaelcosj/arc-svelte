import assert from 'node:assert/strict';
export const scenarios = ['release', 'pause', 'cancel', 'kick', 'catch', 'lag'];
/**
 * @typedef {{position:number,value:number,present:boolean,events:{type:string,value:number}[],t?:number}} Sample
 * @param {import('../dependencies/node_modules/playwright/index').Page} page
 * @param {string} scenario
 * @param {{frame:(n?:number)=>Promise<void>,dispatch:(type:string,x:number,y:number,target?:string)=>Promise<void>,read:()=>Promise<Sample>,trace:(count:number)=>Promise<Sample[]>,baseline?:boolean,source?:boolean}} helpers
 */
export async function exercise(page, scenario, helpers) {
	const { frame, dispatch, read, trace } = helpers;
	const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
	const thumb = page.getByRole('slider').first();
	if (scenario === 'kick') {
		await thumb.focus();
		await frame(2);
		const before = await read();
		await thumb.dispatchEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
		await frame(0);
		const immediate = await read();
		const samples = await trace(60);
		assert.equal(samples[samples.length - 1].value, 100);
		if (!helpers.baseline) {
			assert.ok(
				Math.abs(immediate.position - before.position) < 0.05,
				'velocity kick has no position jump'
			);
			const excursion = Math.max(...samples.map((s) => s.position - before.position));
			assert.ok(reduced ? excursion < 0.05 : excursion > 3, 'kick moves only with normal motion');
			assert.ok(
				Math.abs(samples[samples.length - 1].position - before.position) < 0.05,
				'kick returns home'
			);
			assert.equal(samples[samples.length - 1].events.filter((e) => e.type === 'commit').length, 0);
		}
		return { before, immediate, samples };
	}
	const r = await thumb.boundingBox();
	assert.ok(r, 'visible motion handle');
	const control = await thumb.evaluate((n) => {
		const p = n.closest('[class*=thumbs]')?.previousElementSibling;
		if (!p) throw new Error('Missing slider track');
		return p.getBoundingClientRect().width;
	});
	const x = r.x + r.width / 2,
		y = r.y + r.height / 2;
	if (scenario === 'lag') await page.mouse.move(x + 100, y);
	else await page.mouse.move(x, y);
	await page.mouse.down();
	await dispatch(
		'pointerdown',
		scenario === 'lag' ? x + 100 : x,
		y,
		scenario === 'lag' ? 'track' : 'thumb'
	);
	await frame(1);
	const following = [await read()];
	await dispatch('pointermove', x + control * 0.08, y);
	await frame(1);
	following.push(await read());
	await dispatch('pointermove', x + control * 0.16, y);
	await frame(1);
	following.push(await read());
	if (scenario === 'lag' && !helpers.baseline) {
		const omega = (2 * Math.PI) / (0.26 * 1.2),
			decay = 0.88 * omega,
			frequency = omega * Math.sqrt(1 - 0.88 ** 2);
		for (const [i, state] of following.entries()) {
			const seconds = (i + 1) * 0.016;
			const lag = reduced
				? 0
				: -100 *
					Math.exp(-decay * seconds) *
					(Math.cos(frequency * seconds) + (decay / frequency) * Math.sin(frequency * seconds));
			const placed = x + [100, control * 0.08, control * 0.16][i];
			assert.ok(
				Math.abs(state.position - placed - lag) < 0.001,
				'track lag keeps one fixed-target spring as pointer position changes'
			);
		}
	}
	if (scenario === 'pause') await frame(8);
	const before = await read();
	await dispatch(scenario === 'cancel' ? 'pointercancel' : 'pointerup', x + control * 0.16, y);
	await frame(0);
	const immediate = await read();
	let samples;
	if (scenario === 'catch') {
		samples = await trace(4);
		const caught = await read();
		const b = await thumb.boundingBox();
		assert.ok(b, 'visible motion handle');
		await page.mouse.up();
		await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
		await page.mouse.down();
		await frame(0);
		const afterCatch = await read();
		if (!helpers.baseline)
			assert.ok(
				Math.abs(caught.position - afterCatch.position) < 0.15,
				'catch retains painted position'
			);
		await frame(1);
		await dispatch('pointermove', b.x + b.width / 2 - 20, b.y + b.height / 2);
		await frame(1);
		await dispatch('pointerup', b.x + b.width / 2 - 20, b.y + b.height / 2);
		samples.push(...(await trace(60)));
		return { before, immediate, caught, afterCatch, samples };
	}
	samples = await trace(60);
	if (!helpers.baseline && !helpers.source && !reduced && ['release', 'cancel'].includes(scenario))
		assert.ok(
			samples[2].position - before.position > 20,
			'release retains positive pointer velocity'
		);
	if (scenario === 'release')
		assert.equal(samples[samples.length - 1].value, 70, 'coarse release carries one step');
	if (['pause', 'cancel'].includes(scenario))
		assert.equal(samples[samples.length - 1].value, 60, 'pause/cancel adds no coarse carry');
	assert.ok(Number.isFinite(samples[samples.length - 1].position));
	assert.equal(samples[samples.length - 1].value % 10, 0);
	assert.equal(samples[samples.length - 1].events.filter((e) => e.type === 'commit').length, 1);
	await page.mouse.up();
	return { before, immediate, following, samples };
}
