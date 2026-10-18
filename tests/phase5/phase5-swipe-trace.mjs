// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { server } from './phase5-highlight-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out = { runs: [], comparisons: [], errors: [] };
let browser;
try {
	await server.listen();
	browser = await chromium.launch();
	for (const reduced of [false, true])
		for (const ref of [true, false]) {
			const page = await browser.newPage({
				viewport: { width: 900, height: 600 },
				reducedMotion: reduced ? 'reduce' : 'no-preference'
			});
			const id = `${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
			page.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
			await page.clock.install({ time: new Date('2026-01-01') });
			await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
			await page.goto(`http://127.0.0.1:5225/phase5-highlight?kind=swipe&ref=${ref}`);
			await page.waitForFunction(() => window.swipe);
			await page.evaluate(() => document.fonts.ready);
			await page.addStyleTag({
				content: '*,*::before,*::after{transition:none!important;animation:none!important}'
			});
			await page.evaluate(() => {
				HTMLElement.prototype.setPointerCapture = () => {};
				HTMLElement.prototype.releasePointerCapture = () => {};
				HTMLElement.prototype.hasPointerCapture = () => false;
			});
			await page.clock.runFor(1000);
			const run = { id, scenarios: [] };
			const frame = () => page.clock.runFor(16);
			const fire = (type, dx, dy = 0) =>
				page.evaluate(
					({ type, dx, dy }) =>
						[...document.querySelectorAll('li > [class*=content]')].at(-1).dispatchEvent(
							new PointerEvent(type, {
								bubbles: true,
								cancelable: true,
								pointerType: 'mouse',
								pointerId: 1,
								isPrimary: true,
								button: 0,
								buttons: 1,
								clientX: 60 + dx,
								clientY: 70 + dy
							})
						),
					{ type, dx, dy }
				);
			const read = () =>
				page.evaluate(() => {
					const row = [...document.querySelectorAll('li')].at(-1);
					return {
						x: new DOMMatrixReadOnly(
							getComputedStyle(row.querySelector('[class*=content]')).transform
						).m41,
						layers: [...row.querySelectorAll('[class*=layer]')].map(
							(n) => new DOMMatrixReadOnly(getComputedStyle(n).transform).m41
						),
						removing: row.hasAttribute('data-removing'),
						events: window.swipe.events()
					};
				});
			for (const scenario of [
				'leading',
				'trailing',
				'short',
				'full-keep',
				'full-retain',
				'cancel',
				'catch',
				'axis'
			]) {
				await page.evaluate(() => window.swipe.reset());
				await page.clock.runFor(1200);
				await page.evaluate(() => {
					for (const a of document.getAnimations()) a.finish();
				});
				await page.clock.runFor(32);
				const now = await page.evaluate(() => performance.now());
				await page.clock.fastForward(Math.ceil((now + 1) / 4096) * 4096 - now);
				await fire('pointerdown', 0);
				await frame();
				await fire('pointermove', 10, scenario === 'axis' ? 30 : 0);
				await frame();
				const dx =
					scenario === 'short'
						? 20
						: scenario === 'full-keep'
							? 280
							: scenario === 'full-retain'
								? -280
								: scenario === 'trailing'
									? -100
									: 100;
				await fire('pointermove', 10 + dx, scenario === 'axis' ? 60 : 0);
				await frame();
				await page.clock.runFor(128);
				await fire(scenario === 'cancel' ? 'pointercancel' : 'pointerup', 10 + dx);
				const samples = [];
				for (let i = 0; i < 55; i++) {
					await frame();
					if (scenario === 'catch' && i === 4) {
						await fire('pointerdown', 0);
						await fire('pointermove', -10);
						await frame();
						await fire('pointermove', -55);
						await frame();
						await fire('pointerup', -55);
					}
					samples.push(await read());
				}
				run.scenarios.push({ scenario, samples });
				console.log(id, scenario, 'captured');
			}
			out.runs.push(run);
			await page.close();
		}
	for (const a of out.runs.filter((r) => r.id.endsWith('source'))) {
		const b = out.runs.find((r) => r.id === a.id.replace('source', 'local'));
		for (const s of a.scenarios) {
			const local = b.scenarios.find((x) => x.scenario === s.scenario);
			const error = Math.max(
				...s.samples.map((f, i) =>
					Math.max(
						Math.abs(f.x - local.samples[i].x),
						...f.layers.map((v, j) => Math.abs(v - local.samples[i].layers[j]))
					)
				)
			);
			out.comparisons.push({ id: a.id, scenario: s.scenario, error });
			assert.ok(error < 0.001, `${a.id} ${s.scenario} trajectory ${error}`);
			assert.deepEqual(s.samples.at(-1).events, local.samples.at(-1).events);
		}
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-swipe-traces.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
