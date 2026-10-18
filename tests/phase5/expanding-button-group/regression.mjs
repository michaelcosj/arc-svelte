// @ts-nocheck -- Browser verification harness; browser globals are provided by the fixtures.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { start } from './server.mjs';
import { chromium } from '../dependencies/node_modules/playwright/index.mjs';
const s = await start(),
	browser = await chromium.launch(),
	results = {};
const deadline = setTimeout(() => process.exit(2), 60000);
try {
	await s.listen();
	for (const reduced of [false, true])
		for (const ref of [true, false]) {
			const id = `${ref ? 'ref' : 'local'}-${reduced ? 'reduced' : 'normal'}`;
			const page = await browser.newPage({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
			const errors = [];
			page.on('pageerror', (error) => errors.push(error.message));
			await page.goto(`http://127.0.0.1:5221/ebg-${ref ? 'ref' : 'local'}`);
			await page.waitForFunction(() => window.ebg && document.querySelector('[data-ebg-item]'));
			await page.evaluate(() => document.fonts.ready);
			await page.evaluate(() => window.ebg.visible(false));
			await page.waitForTimeout(40);
			await page.evaluate(() => window.ebg.visible(true));
			await page.waitForFunction(() => document.querySelector('[data-ebg-item]'));
			const initialFrames = await page.evaluate(async () => {
				const frames = [];
				for (let i = 0; i < 20; i++) {
					await new Promise(requestAnimationFrame);
					frames.push(
						[...document.querySelectorAll('[data-ebg-item]')].map((n) => ({
							width: n.getBoundingClientRect().width,
							animations: n
								.getAnimations({ subtree: true })
								.filter((a) => a.playState === 'running').length
						}))
					);
				}
				return frames;
			});
			assert(
				initialFrames.every((frame) =>
					frame.every(
						(item, index) =>
							Math.abs(item.width - initialFrames[0][index].width) < 0.1 && item.animations === 0
					)
				),
				id + ' stable first paint'
			);
			const runs = [];
			for (const duration of [0, 75, 1400]) {
				await page.evaluate((duration) => {
					window.ebg.visible(false);
					window.ebg.configure({ confirmDuration: duration });
				}, duration);
				await page.waitForTimeout(40);
				await page.evaluate(() => window.ebg.visible(true));
				await page.waitForTimeout(300);
				runs.push(
					await page.evaluate(async (duration) => {
						const button = document.querySelectorAll('[data-ebg-item]')[1];
						const originalGlyph = button.querySelector('[class*="_glyph"]');
						const originalWord = button.querySelector('[class*="_word"]');
						const frames = [];
						let start;
						await new Promise((resolve) =>
							requestAnimationFrame((t) => {
								start = t;
								button.click();
								const step = (t) => {
									const glyphs = [...button.querySelectorAll('[class*="_glyph"]')];
									const words = [...button.querySelectorAll('[class*="_word"]')];
									frames.push({
										t: t - start,
										state: button.dataset.state,
										glyphs: glyphs.map((node) => ({
											original: node === originalGlyph,
											opacity: +getComputedStyle(node).opacity,
											check: !!node.querySelector('svg path[d="M4 12.5l5 5L20 6.5"]')
										})),
										words: words.map((node) => ({
											original: node === originalWord,
											text: node.textContent,
											opacity: +getComputedStyle(node).opacity
										})),
										animations: words.flatMap((node) =>
											node.getAnimations().map((a) => ({
												time: a.currentTime,
												duration: a.effect.getTiming().duration,
												frames: a.effect.getKeyframes()
											}))
										)
									});
									if (t - start < 400) requestAnimationFrame(step);
									else resolve();
								};
								requestAnimationFrame(step);
							})
						);
						return { duration, frames };
					}, duration)
				);
			}
			const zero = runs[0].frames.find((f) => f.t >= 100);
			if (reduced && !ref) {
				assert.equal(zero.words.length, 1, id + ' zero outgoing word');
				assert.equal(zero.glyphs.length, 1, id + ' zero outgoing glyph');
			}
			const fast = runs[1].frames;
			assert(
				fast.some(
					(f) => f.glyphs.length === 2 && f.glyphs.every((g) => g.opacity > 0 && g.opacity < 1)
				),
				id + ' painted interrupted overlap'
			);
			assert(
				fast.at(-1).glyphs.some((g) => g.original),
				id + ' returning icon identity'
			);
			assert(
				fast.at(-1).words.some((w) => w.original),
				id + ' returning word identity'
			);
			assert(
				fast
					.filter((f) => f.state === 'idle' && f.t > 100)
					.every((f) => f.glyphs.length <= 2 && f.words.length <= 2),
				id + ' no duplicate returning keys'
			);
			assert.equal(fast.at(-1).words.length, 1, id + ' exits complete');
			assert.deepEqual(errors, []);
			results[id] = { errors, initialFrames, runs };
			console.log(id, 'PASS');
			await page.close();
		}
	writeFileSync('handoff/motion-ebg-fix-regression.json', JSON.stringify(results, null, 2));
} finally {
	clearTimeout(deadline);
	await browser.close();
	await s.close();
}
