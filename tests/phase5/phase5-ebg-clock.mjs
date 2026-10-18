// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { start } from './expanding-button-group/server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import { installAnimationClock, installResizeClock, advance } from './phase5-animation-clock.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = { runs: [], comparisons: [], errors: [] };
let browser;
const server = await start();
try {
	await server.listen();
	browser = await chromium.launch();
	for (const reduced of [false, true])
		for (const ref of [true, false]) {
			const page = await browser.newPage({
				viewport: { width: 1000, height: 700 },
				reducedMotion: reduced ? 'reduce' : 'no-preference'
			});
			const id = `${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
			page.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
			await installAnimationClock(page);
			await installResizeClock(page);
			await page.clock.install({ time: new Date('2026-01-01') });
			await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
			await page.goto(`http://127.0.0.1:5221/ebg-${ref ? 'ref' : 'local'}`);
			await page.waitForFunction(() => window.ebg);
			await page.evaluate(() => document.fonts.ready);
			const run = { id, scenarios: [] };
			const read = () =>
				page.evaluate(() =>
					[...document.querySelectorAll('[data-ebg-item]')].map((n) => {
						const style = (e) => {
							const s = getComputedStyle(e),
								m = new DOMMatrixReadOnly(s.transform);
							return {
								opacity: +s.opacity,
								x: m.m41,
								y: m.m42,
								scale: m.m11,
								blur: parseFloat(s.filter.match(/[\d.]+/)?.[0] ?? '0')
							};
						};
						const part = (k) => n.querySelector(`[class*="_${k}"]`);
						return {
							width: n.getBoundingClientRect().width,
							label: style(part('label')),
							glyphs: [...n.querySelectorAll('[class*="_glyph"]')].map((g) => ({
								key: !!g.querySelector('path[d="M4 12.5l5 5L20 6.5"]'),
								...style(g)
							})),
							words: [...n.querySelectorAll('[class*="_word"]')].map((w) => ({
								key: w.textContent,
								...style(w)
							}))
						};
					})
				);
			const hover = (index) =>
				page.evaluate((index) => {
					const b = [...document.querySelectorAll('[data-ebg-item]')][index],
						r = b.getBoundingClientRect();
					b.dispatchEvent(
						new PointerEvent('pointermove', {
							bubbles: true,
							pointerType: 'mouse',
							clientX: r.x + 10,
							clientY: r.y + 10
						})
					);
				}, index);
			for (const scenario of ['hover', 'reverse', 'confirm', 'short-confirm', 'zero-confirm']) {
				await page.evaluate(() => window.ebg.visible(false));
				await advance(page, 2000);
				await page.evaluate(
					(scenario) =>
						window.ebg.configure({
							confirmDuration:
								scenario === 'zero-confirm' ? 0 : scenario === 'short-confirm' ? 75 : 1400
						}),
					scenario
				);
				await page.evaluate(() => window.ebg.visible(true));
				await advance(page, 1200);
				const now = await page.evaluate(() => performance.now());
				await page.clock.fastForward(Math.ceil((now + 1) / 4096) * 4096 - now);
				await page.evaluate(() => window.advanceAnimations());
				const initial = await read();
				if (scenario === 'hover' || scenario === 'reverse') await hover(1);
				else
					await page
						.locator('[data-ebg-item]')
						.nth(1)
						.evaluate((n) => n.click());
				const samples = [];
				for (let i = 0; i < 60; i++) {
					if (scenario === 'reverse' && i === 5) await hover(0);
					await advance(page);
					samples.push(await read());
				}
				run.scenarios.push({ scenario, initial, samples });
				console.log(id, scenario, 'captured');
			}
			out.runs.push(run);
			await page.close();
		}
	for (const a of out.runs.filter((r) => r.id.endsWith('source'))) {
		const b = out.runs.find((r) => r.id === a.id.replace('source', 'local'));
		for (const s of a.scenarios) {
			const l = b.scenarios.find((x) => x.scenario === s.scenario);
			const error = { id: a.id, scenario: s.scenario, width: 0, label: 0, glyph: 0, word: 0 };
			for (let i = 0; i < s.samples.length; i++)
				for (let j = 0; j < 3; j++) {
					const f = s.samples[i][j],
						g = l.samples[i][j];
					error.width = Math.max(error.width, Math.abs(f.width - g.width));
					for (const k of ['opacity', 'x', 'blur'])
						error.label = Math.max(error.label, Math.abs(f.label[k] - g.label[k]));
					for (const [kind, name] of [
						['glyphs', 'glyph'],
						['words', 'word']
					])
						for (const key of new Set([...f[kind], ...g[kind]].map((x) => x.key))) {
							const v = f[kind].find((x) => x.key === key),
								w = g[kind].find((x) => x.key === key);
							error[name] = Math.max(error[name], Math.abs((v?.opacity ?? 0) - (w?.opacity ?? 0)));
						}
				}
			out.comparisons.push(error);
			console.log(error);
			assert.ok(error.width <= 1 / 64, 'width quantization');
			assert.ok(error.label < 0.003, 'label curve');
			assert.ok(error.glyph < 0.001, 'glyph presence');
			assert.ok(error.word < 0.001, 'word presence');
		}
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-ebg-clock.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
