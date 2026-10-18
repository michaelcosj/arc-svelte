// @ts-nocheck -- Paired browser tracks are asserted at runtime.
import { start } from './phase5-existing-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import { installAnimationClock, installResizeClock, advance } from './phase5-animation-clock.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out = { runs: [], comparisons: [], errors: [] };
let browser;
const server = await start();
try {
	browser = await chromium.launch();
	for (const kind of ['standard', 'slider'])
		for (const scenario of ['close', 'reverse', 'endpoint'])
			for (const reduced of [false, true])
				for (const ref of [true, false]) {
					const id = `${kind}-${scenario}-${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
					if (process.argv[2] && !id.includes(process.argv[2])) continue;
					const p = await browser.newPage({
						viewport: { width: 900, height: 700 },
						reducedMotion: reduced ? 'reduce' : 'no-preference'
					});
					p.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
					await installAnimationClock(p);
					await installResizeClock(p);
					await p.clock.install({ time: new Date('2026-01-01') });
					await p.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
					await p.goto(`http://127.0.0.1:5213/existing-${ref ? 'react' : 'local'}?kind=${kind}`);
					const control = p.getByRole('slider');
					await control.waitFor();
					await p.evaluate(() => document.fonts.ready);
					for (let i = 0; i < 8; i++) await advance(p);
					await advance(p, 1500);
					for (let i = 0; i < 4; i++) await advance(p);
					const now = await p.evaluate(() => performance.now());
					await p.clock.fastForward(Math.ceil((now + 1) / 4096) * 4096 - now);
					await p.evaluate(() => window.advanceAnimations());
					const read = () =>
						p.evaluate(() => {
							const n = document.querySelector('[class*="_bubble"]:not([class*="bubbleAnchor"])');
							if (!n) return { present: false };
							const s = getComputedStyle(n),
								m = new DOMMatrixReadOnly(s.transform);
							return {
								present: true,
								opacity: +s.opacity,
								scale: m.m11 * (s.scale === 'none' ? 1 : parseFloat(s.scale)),
								y:
									m.m42 +
									(s.translate === 'none' ? 0 : parseFloat(s.translate.split(' ')[1] ?? '0')),
								blur: parseFloat(s.filter.match(/[\d.]+/)?.[0] ?? '0')
							};
						});
					assert.equal((await read()).present, false);
					await p.keyboard.press('Tab');
					assert.equal(await control.evaluate((n) => document.activeElement === n), true);
					const samples = [];
					for (let i = 0; i < 55; i++) {
						if (i === 8) await control.evaluate((n) => n.blur());
						if ((scenario === 'reverse' && i === 12) || (scenario === 'endpoint' && i === 16))
							await control.focus();
						await advance(p);
						samples.push(await read());
					}
					out.runs.push({ id, samples });
					console.log(id, 'captured');
					await p.close();
				}
	for (const a of out.runs.filter((r) => r.id.endsWith('source'))) {
		const b = out.runs.find((r) => r.id === a.id.replace('source', 'local')),
			c = { id: a.id, presence: 0, opacity: 0, scale: 0, y: 0, blur: 0 };
		for (let i = 0; i < a.samples.length; i++) {
			const f = a.samples[i],
				g = b.samples[i];
			if (f.present !== g.present) {
				c.presence++;
				assert.ok(
					(f.present ? f.opacity : g.opacity) < 0.001,
					`${a.id}: visible lifetime mismatch`
				);
			}
			if (!f.present || !g.present) continue;
			for (const key of ['opacity', 'scale', 'y', 'blur'])
				c[key] = Math.max(c[key], Math.abs(f[key] - g[key]));
		}
		out.comparisons.push(c);
		console.log(c);
		assert.equal(c.presence, 0, `${a.id}: endpoint lifetime`);
		for (const key of ['opacity', 'scale', 'y', 'blur'])
			assert.ok(c[key] < 0.001, `${a.id}: ${key} differs by ${c[key]}`);
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-bubble-clock.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
