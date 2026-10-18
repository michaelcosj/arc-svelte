// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { installResizeClock } from './phase5-animation-clock.mjs';
import { server } from './phase5-highlight-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = { runs: [], comparisons: [], errors: [] };
let browser;
try {
	await server.listen();
	browser = await chromium.launch();
	for (const reduced of [false, true])
		for (const ref of [true, false]) {
			const id = `${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`,
				page = await browser.newPage({
					viewport: { width: 900, height: 600 },
					reducedMotion: reduced ? 'reduce' : 'no-preference'
				});
			page.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
			await installResizeClock(page);
			await page.clock.install({ time: new Date('2026-01-01') });
			await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
			await page.goto(`http://127.0.0.1:5225/phase5-highlight?kind=carousel&ref=${ref}`);
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
			const fire = (type, x, y = 0) =>
				page.evaluate(
					({ type, x, y }) => {
						const e = new PointerEvent(type, {
							bubbles: true,
							pointerType: 'mouse',
							pointerId: 1,
							isPrimary: true,
							button: 0,
							buttons: 1,
							clientX: 200 + x,
							clientY: 100 + y
						});
						Object.defineProperty(e, 'timeStamp', { value: performance.now() });
						document.querySelector('[aria-label=Slides]').dispatchEvent(e);
					},
					{ type, x, y }
				);
			const read = () =>
				page.evaluate(() => {
					const track = document.querySelector('[class*=track]');
					return {
						x: new DOMMatrixReadOnly(getComputedStyle(track).transform).m41,
						slides: [...document.querySelectorAll('[role=tabpanel]')].map((n) => ({
							opacity: +getComputedStyle(n).opacity,
							scale: new DOMMatrixReadOnly(getComputedStyle(n).transform).m11,
							inert: n.inert
						})),
						dots: [...document.querySelectorAll('[class$=dot], [class*=__dot]')]
							.filter((n) => n.className.endsWith('dot'))
							.map((n) => n.getBoundingClientRect().width),
						selected: [...document.querySelectorAll('[role=tab]')].map((n) =>
							n.getAttribute('aria-selected')
						),
						events: window.swipe.events()
					};
				});
			for (const scenario of [
				'next',
				'reverse',
				'drag',
				'flick',
				'edge',
				'cancel',
				'catch',
				'wheel',
				'axis'
			]) {
				await page.evaluate(() => window.swipe.reset());
				// Let the keyed reset commit before delivering its initial measurements.
				for (let frame = 0; frame < 4; frame++) {
					await page.evaluate(
						() =>
							new Promise((resolve) => {
								const channel = new MessageChannel();
								channel.port1.onmessage = () => {
									channel.port1.close();
									channel.port2.close();
									resolve();
								};
								channel.port2.postMessage(null);
							})
					);
					await page.evaluate(() => window.flushResizeObservers());
					await page.clock.runFor(16);
				}
				await page.clock.runFor(1200);
				await page.evaluate(() => {
					for (const a of document.getAnimations()) a.finish();
				});
				await page.clock.runFor(32);
				const now = await page.evaluate(() => performance.now());
				await page.clock.fastForward(Math.ceil((now + 1) / 4096) * 4096 - now);
				if (['next', 'reverse'].includes(scenario))
					await page.getByRole('button', { name: 'Next slide' }).evaluate((n) => n.click());
				else if (scenario === 'wheel')
					await page
						.getByRole('group', { name: 'Slides' })
						.dispatchEvent('wheel', { deltaX: 150, deltaY: 0 });
				else {
					await fire('pointerdown', 0);
					await page.clock.runFor(16);
					await fire('pointermove', -10, scenario === 'axis' ? 30 : 0);
					await page.clock.runFor(16);
					await fire('pointermove', scenario === 'edge' ? 800 : -110, scenario === 'axis' ? 60 : 0);
					await page.clock.runFor(16);
					if (scenario !== 'flick') await page.clock.runFor(128);
					await fire(
						scenario === 'cancel' ? 'pointercancel' : 'pointerup',
						scenario === 'edge' ? 800 : -110
					);
				}
				const samples = [];
				for (let i = 0; i < 65; i++) {
					if (scenario === 'reverse' && i === 4)
						await page.getByRole('button', { name: 'Previous slide' }).evaluate((n) => n.click());
					if (scenario === 'catch' && i === 4) {
						await fire('pointerdown', 0);
						await page.clock.runFor(16);
						await fire('pointermove', 10);
						await page.clock.runFor(16);
						await fire('pointermove', 90);
						await page.clock.runFor(16);
						await fire('pointerup', 90);
					}
					await page.clock.runFor(16);
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
			const l = b.scenarios.find((t) => t.scenario === s.scenario);
			const error = Math.max(...s.samples.map((f, i) => Math.abs(f.x - l.samples[i].x)));
			out.comparisons.push({ id: a.id, scenario: s.scenario, error });
			assert.ok(error < 0.001, `${a.id} ${s.scenario} travel ${error}`);
			for (let i = 0; i < s.samples.length; i++) {
				assert.deepEqual(s.samples[i].selected, l.samples[i].selected);
				for (let j = 0; j < 3; j++)
					assert.ok(
						Math.abs(s.samples[i].slides[j].opacity - l.samples[i].slides[j].opacity) < 0.001
					);
			}
			assert.deepEqual(s.samples.at(-1).events, l.samples.at(-1).events);
		}
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-carousel-traces.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
