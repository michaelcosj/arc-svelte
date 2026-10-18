// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { server } from './phase5-panels-final-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = { runs: [], comparisons: [], errors: [] };
let browser;
try {
	await server.listen();
	browser = await chromium.launch();
	for (const reduced of [false, true])
		for (const scenario of ['collapse', 'restore', 'reverse', 'keys', 'catch', 'cancel'])
			for (const ref of [true, false]) {
				const id = `${scenario}-${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
				const page = await browser.newPage({
					viewport: { width: 1000, height: 700 },
					reducedMotion: reduced ? 'reduce' : 'no-preference'
				});
				page.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
				await page.clock.install({ time: new Date('2026-01-01') });
				await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
				await page.goto(
					`http://127.0.0.1:5217/panels-final?ref=${ref}&case=${scenario === 'restore' ? 'before' : 'collapse'}`
				);
				await page.waitForFunction(() => window.fixture);
				await page.evaluate(() => document.fonts.ready);
				await page.evaluate(() => {
					HTMLElement.prototype.setPointerCapture = () => {};
					HTMLElement.prototype.releasePointerCapture = () => {};
					HTMLElement.prototype.hasPointerCapture = () => false;
				});
				await page.clock.runFor(1200);
				await page.clock.fastForward(8192 - (await page.evaluate(() => performance.now())));
				const key = (key) =>
					page
						.getByRole('separator')
						.dispatchEvent('keydown', { key, bubbles: true, cancelable: true });
				const fire = (type, x) =>
					page.getByRole('separator').dispatchEvent(type, {
						clientX: x,
						clientY: 100,
						pointerId: 1,
						pointerType: 'mouse',
						isPrimary: true,
						button: 0,
						buttons: 1,
						bubbles: true
					});
				const read = () =>
					page.evaluate(() => {
						const g = document.querySelector('[aria-label="Fixture panels"]'),
							panes = [...g.children].filter((n) => n.id);
						return {
							widths: panes.map((n) => n.getBoundingClientRect().width),
							fades: panes.map((n) => +getComputedStyle(n.firstElementChild).opacity),
							collapsed: panes.map((n) => n.hasAttribute('data-collapsed')),
							free: panes.map((n) => n.hasAttribute('data-free')),
							aria: g.querySelector('[role=separator]').getAttribute('aria-valuetext'),
							events: window.logs.slice()
						};
					});
				const start = await read();
				if (['catch', 'cancel'].includes(scenario)) {
					await fire('pointerdown', 200);
					await page.clock.runFor(16);
					await fire('pointermove', -20);
				} else await key(scenario === 'keys' ? 'ArrowLeft' : 'Enter');
				const samples = [];
				for (let i = 0; i < 85; i++) {
					if (scenario === 'reverse' && i === 4) await key('Enter');
					if (scenario === 'keys' && [2, 4, 6, 8].includes(i)) await key('ArrowLeft');
					if (scenario === 'catch' && i === 4) await fire('pointermove', 100);
					if (['catch', 'cancel'].includes(scenario) && i === 9)
						await fire(scenario === 'cancel' ? 'pointercancel' : 'pointerup', 100);
					await page.clock.runFor(16);
					samples.push(await read());
				}
				out.runs.push({ id, start, samples });
				console.log(id, 'captured');
				await page.close();
			}
	for (const a of out.runs.filter((r) => r.id.endsWith('source'))) {
		const b = out.runs.find((r) => r.id === a.id.replace('source', 'local'));
		const c = {
			id: a.id.replace('-source', ''),
			width: Math.max(
				...a.samples.map((f, i) =>
					Math.max(...f.widths.map((v, j) => Math.abs(v - b.samples[i].widths[j])))
				)
			),
			fade: Math.max(
				...a.samples.map((f, i) =>
					Math.max(...f.fades.map((v, j) => Math.abs(v - b.samples[i].fades[j])))
				)
			)
		};
		out.comparisons.push(c);
		console.log(c);
		assert.ok(c.width < 0.001, 'paired pane geometry');
		assert.ok(c.fade < 0.001, 'paired pane fade');
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-panels-clock.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
