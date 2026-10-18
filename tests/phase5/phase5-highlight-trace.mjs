// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { server } from './phase5-highlight-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const result = { runs: [], comparisons: [], errors: [] };
let browser;
try {
	await server.listen();
	browser = await chromium.launch();
	for (const kind of ['floating', 'button'])
		for (const reduced of [false, true])
			for (const ref of [true, false]) {
				const id = `${kind}-${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
				const page = await browser.newPage({
					viewport: { width: 900, height: 600 },
					reducedMotion: reduced ? 'reduce' : 'no-preference'
				});
				page.on('pageerror', (e) => result.errors.push({ id, message: e.message }));
				await page.clock.install({ time: new Date('2026-01-01') });
				await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
				await page.goto(`http://127.0.0.1:5225/phase5-highlight?ref=${ref}&kind=${kind}`);
				await page.getByRole('button', { name: 'Alpha', exact: true }).waitFor();
				await page.evaluate(() => document.fonts.ready);
				await page.addStyleTag({
					content:
						'*,*::before,*::after { transition: none !important; animation: none !important; }'
				});
				await page.clock.runFor(1000);
				await page.clock.fastForward(8192 - (await page.evaluate(() => performance.now())));
				const read = () =>
					page.evaluate(() => {
						const h = document.querySelector('[class*=highlight]'),
							s = getComputedStyle(h),
							t = new DOMMatrixReadOnly(s.transform);
						return {
							x: t.m41,
							y: t.m42,
							w: parseFloat(s.width),
							h: parseFloat(s.height),
							scale: t.m11,
							opacity: Number(s.opacity)
						};
					});
				const event = async (name, type = 'pointermove') => {
					await page.getByRole('button', { name, exact: true }).dispatchEvent(type, {
						pointerType: 'mouse',
						button: 0,
						isPrimary: true,
						bubbles: true
					});
					await page.evaluate(() => new Promise((r) => queueMicrotask(r)));
				};
				await event('Alpha');
				await page.clock.runFor(640);
				const samples = [];
				for (const [name, type, count] of [
					['Longer Beta', 'pointermove', 5],
					['Gamma', 'pointermove', 5],
					['Alpha', 'pointermove', 45],
					['Alpha', 'pointerdown', 10],
					['Alpha', 'pointerup', 30]
				]) {
					await event(name, type);
					for (let i = 0; i < count; i++) {
						await page.clock.runFor(16);
						samples.push({ name, type, frame: i, ...(await read()) });
					}
				}
				result.runs.push({ id, samples });
				console.log(id, 'captured');
				await page.close();
			}
	for (const source of result.runs.filter((r) => r.id.endsWith('source'))) {
		const local = result.runs.find((r) => r.id === source.id.replace('source', 'local'));
		const error = { id: source.id.replace('-source', '') };
		for (const key of ['x', 'y', 'w', 'h', 'scale', 'opacity'])
			error[key] = Math.max(
				...source.samples.map((s, i) => Math.abs(s[key] - local.samples[i][key]))
			);
		result.comparisons.push(error);
		console.log(error);
	}
	assert.equal(result.errors.length, 0);
	for (const c of result.comparisons)
		for (const key of ['x', 'y', 'w', 'h', 'scale', 'opacity'])
			assert.ok(c[key] < 0.001, c.id + ' ' + key + ' trajectory');
} finally {
	await fs.writeFile('handoff/phase5-highlight-traces.json', JSON.stringify(result, null, 2));
	await browser?.close();
	await server.close();
}
