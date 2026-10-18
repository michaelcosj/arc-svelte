import assert from 'node:assert/strict';
export const scenarios = [
	'release',
	'pause',
	'cancel',
	'dismiss',
	'stretch',
	'catch',
	'reopen',
	'closed-rest',
	'granular'
];
/**
 * @typedef {{position:number,value:number,present:boolean,events:{type:string,value:number}[],t?:number}} Sample
 * @param {import('../dependencies/node_modules/playwright/index').Page} page
 * @param {string} scenario
 * @param {{frame:(n?:number)=>Promise<void>,dispatch:(type:string,x:number,y:number,target?:string)=>Promise<void>,read:()=>Promise<Sample>,trace:(count:number)=>Promise<Sample[]>,baseline?:boolean,source?:boolean}} helpers
 */
export async function exercise(page, scenario, helpers) {
	const { frame, dispatch, read, trace } = helpers;
	const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
	if (scenario === 'reopen') {
		const before = await read();
		await page.evaluate('window.fixture.open(false)');
		await frame(4);
		const caught = await read();
		await page.evaluate('window.fixture.open(true)');
		await frame(0);
		const afterCatch = await read();
		if (!helpers.baseline && !helpers.source)
			assert.ok(
				Math.abs(caught.position - afterCatch.position) < 0.15,
				'reopen catches the painted exit'
			);
		const samples = await trace(90);
		assert.ok(
			samples.every((s) => s.present),
			'old exit callback cannot remove reopened sheet'
		);
		assert.ok(Math.abs(samples[samples.length - 1].position - before.position) < 0.05);
		return { before, caught, afterCatch, samples };
	}
	const h = page.locator('[class*="header"]').last();
	const r = await h.boundingBox();
	assert.ok(r, 'visible motion handle');
	const x = r.x + 30,
		y = r.y + 30;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await dispatch('pointerdown', x, y);
	await frame(1);
	const initial = await read();
	const delta =
		scenario === 'closed-rest'
			? (await page.getByRole('dialog').evaluate((n) => {
					if (!(n instanceof HTMLElement)) throw new Error('Expected sheet element');
					return n.offsetHeight - 120;
				})) - initial.position
			: scenario === 'dismiss'
				? 80
				: scenario === 'stretch'
					? -120
					: scenario === 'granular'
						? -4
						: -80;
	await dispatch('pointermove', x, y + delta / 2);
	await frame(1);
	await dispatch('pointermove', x, y + delta);
	await frame(1);
	if (['pause', 'closed-rest'].includes(scenario)) await frame(8);
	const before = await read();
	await dispatch(scenario === 'cancel' ? 'pointercancel' : 'pointerup', x, y + delta);
	await frame(0);
	const immediate = await read();
	let samples;
	if (scenario === 'catch') {
		samples = await trace(4);
		const caught = await read();
		const b = await h.boundingBox();
		assert.ok(b, 'visible motion handle');
		await page.mouse.up();
		await page.mouse.move(b.x + 30, b.y + 30);
		await page.mouse.down();
		await frame(0);
		const afterCatch = await read();
		if (!helpers.baseline)
			assert.ok(
				Math.abs(caught.position - afterCatch.position) < 0.15,
				'catch retains painted position'
			);
		await frame(1);
		await dispatch('pointermove', b.x + 30, b.y + 60);
		await frame(1);
		await dispatch('pointerup', b.x + 30, b.y + 60);
		samples.push(...(await trace(90)));
		if (!helpers.baseline) {
			assert.equal(
				samples[samples.length - 1].present,
				reduced,
				'catch reversal matches source detent/dismiss outcome'
			);
			assert.deepEqual(
				samples[samples.length - 1].events,
				reduced
					? [{ type: 'detent', value: 1 }]
					: [
							{ type: 'detent', value: 1 },
							{ type: 'open', value: false }
						],
				'catch reversal callbacks match source'
			);
		}
		return { before, immediate, caught, afterCatch, samples };
	}
	samples = await trace(90);
	await page.mouse.up();
	if (!helpers.baseline && !reduced && ['release', 'cancel'].includes(scenario))
		assert.ok(
			Math.abs(samples[4].position - 263.397) < 0.01,
			'time-defined release matches effective zero-velocity source trajectory'
		);
	if (['dismiss', 'closed-rest'].includes(scenario))
		assert.equal(samples[samples.length - 1].present, false, 'exit arrival removes sheet');
	else {
		assert.ok(samples[samples.length - 1].present);
		assert.ok(
			Math.abs(
				samples[samples.length - 1].position -
					(scenario === 'pause'
						? before.position + 80
						: scenario === 'granular'
							? before.position + 4
							: 0)
			) < 0.05,
			'release reaches its detent'
		);
	}
	return { before, immediate, samples };
}
