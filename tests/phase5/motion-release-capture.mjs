// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { server } from './motion-release-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as slider from './slider/release.browser.mjs';
import * as sheet from './bottom-sheet/release.browser.mjs';
const phase = process.argv[2] ?? 'after';
const report = { phase, runs: [], errors: [], comparisons: [] };
let browser;
try {
	await server.listen();
	browser = await chromium.launch();
	for (const { kind, test } of [
		{ kind: 'slider', test: slider },
		{ kind: 'sheet', test: sheet }
	])
		for (const reduced of [false, true])
			for (const scenario of test.scenarios)
				for (const ref of [true, false]) {
					const id = `${kind}-${scenario}-${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
					if (process.argv[3] && !id.includes(process.argv[3])) continue;
					const page = await browser.newPage({
						viewport: { width: 1000, height: 700 },
						reducedMotion: reduced ? 'reduce' : 'no-preference'
					});
					page.on('pageerror', (e) => report.errors.push({ id, message: e.message }));
					try {
						await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
						await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
						await page.goto(
							`http://127.0.0.1:5224/motion-release?ref=${ref}&kind=${kind === 'slider' ? 'slider' : 'sheet'}&case=${scenario}`
						);
						await page.waitForFunction(() => window.fixture, {}, { timeout: 10000 });
						await page.clock.runFor(1600);
						await page.evaluate(() => {
							for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'])
								window.addEventListener(
									type,
									(e) => Object.defineProperty(e, 'timeStamp', { value: performance.now() }),
									true
								);
						});
						await page.evaluate((kind) => {
							window.kind = kind;
							window.lastRafMs = 0;
							const tick = (t) => {
								window.lastRafMs = t;
								requestAnimationFrame(tick);
							};
							requestAnimationFrame(tick);
							window.read = () => {
								if (kind === 'slider') {
									const n = document.querySelector('[role=slider]'),
										r = n.getBoundingClientRect();
									return {
										clockMs: performance.now(),
										rafMs: window.lastRafMs,
										position: r.x + r.width / 2,
										value: Number(n.getAttribute('aria-valuenow')),
										present: true,
										events: window.events.slice()
									};
								}
								const n = document.querySelector('[role=dialog]');
								return {
									clockMs: performance.now(),
									rafMs: window.lastRafMs,
									position: n ? new DOMMatrixReadOnly(getComputedStyle(n).transform).m42 : null,
									present: !!n,
									events: window.events.slice(),
									opacity: n ? Number(getComputedStyle(n).opacity) : 0
								};
							};
						}, kind);
						await page.clock.fastForward(8192 - (await page.evaluate(() => performance.now())));
						const frame = async (n = 1) => {
							if (n) await page.clock.runFor(n * 16);
							else await page.evaluate(() => new Promise((resolve) => queueMicrotask(resolve)));
						};
						const read = () => page.evaluate(() => window.read());
						const dispatch = (type, x, y, target = 'thumb') =>
							page.evaluate(
								({ type, x, y, target }) => {
									const node =
										window.kind === 'slider'
											? document.querySelector('[role=slider]').closest('[class*=thumbs]')
													.parentElement
											: document.querySelector('[data-grabber]').parentElement;
									(type === 'pointerdown' && window.kind === 'slider' && target !== 'track'
										? document.querySelector('[role=slider]')
										: node
									).dispatchEvent(
										new PointerEvent(type, {
											pointerId: 1,
											pointerType: 'mouse',
											button: 0,
											buttons: type === 'pointermove' ? 1 : 0,
											isPrimary: true,
											clientX: x,
											clientY: y,
											bubbles: true,
											cancelable: true
										})
									);
								},
								{ type, x, y, target }
							);
						let phaseIndex = 0;
						const trace = async (count) => {
							const samples = [];
							const phase = phaseIndex++;
							let origin;
							for (let i = 0; i <= count; i++) {
								const state = await read();
								origin ??= state.clockMs;
								samples.push({ phase, frame: i, t: state.clockMs - origin, ...state });
								if (i === 4)
									await page.screenshot({
										path:
											'handoff/motion-release-' +
											process.argv[2] +
											'-' +
											id +
											'-phase' +
											phase +
											'-frame004.png'
									});
								if (i < count) await frame();
							}
							return samples;
						};
						const result = await test.exercise(page, scenario, {
							frame,
							dispatch,
							read,
							trace,
							baseline: phase === 'before',
							source: ref
						});
						await page.screenshot({ path: `handoff/motion-release-${phase}-${id}.png` });
						report.runs.push({ id, pass: true, ...result });
						console.log(id, 'PASS');
					} catch (e) {
						report.runs.push({ id, pass: false, error: e.stack });
						console.log(id, 'FAIL', e.message);
					} finally {
						await page.close();
						await fs.writeFile(
							`handoff/motion-release-${phase}.json`,
							JSON.stringify(report, null, 2)
						);
					}
				}
	for (const a of report.runs.filter((r) => r.id.endsWith('-source') && r.samples)) {
		const b = report.runs.find((r) => r.id === a.id.replace(/source$/, 'local'));
		if (!b?.samples) continue;
		const samples = a.samples.map((s, i) => ({
			phase: s.phase,
			frame: s.frame,
			t: s.t,
			sourceRafMs: s.rafMs,
			localRafMs: b.samples[i]?.rafMs,
			sourceClockMs: s.clockMs,
			localClockMs: b.samples[i]?.clockMs,
			source: s.position,
			local: b.samples[i]?.position,
			sourcePresent: s.present,
			localPresent: b.samples[i]?.present,
			error:
				s.position === null || b.samples[i]?.position === null
					? null
					: Math.abs(s.position - b.samples[i].position)
		}));
		for (const s of samples) {
			assert.equal(s.sourceClockMs, s.localClockMs, 'paired clock alignment');
			assert.equal(s.sourceRafMs, s.localRafMs, 'paired rAF alignment');
		}
		report.comparisons.push({
			presenceMismatchFrames: samples.filter((s) => s.sourcePresent !== s.localPresent).length,
			id: a.id.replace(/-source$/, ''),
			maxError: Math.max(...samples.filter((s) => s.error !== null).map((s) => s.error)),
			samples
		});
	}
	if (phase === 'after') {
		for (const comparison of report.comparisons) {
			const values = comparison.samples.filter(
				(s) => s.error !== null && !(comparison.id.endsWith('-reduced') && s.frame === 0)
			);
			assert.ok(
				values.every((s) => s.error < 0.001),
				comparison.id + ' frame-aligned trajectory'
			);
			const limit =
				comparison.id === 'sheet-catch-normal'
					? 2
					: [
								'sheet-closed-rest-normal',
								'sheet-dismiss-reduced',
								'sheet-closed-rest-reduced'
						  ].includes(comparison.id)
						? 1
						: 0;
			assert.ok(
				comparison.presenceMismatchFrames <= limit,
				comparison.id + ' presence timing bound'
			);
		}
		for (const source of report.runs.filter((r) => r.id.endsWith('-source') && r.samples)) {
			const local = report.runs.find((r) => r.id === source.id.replace(/source$/, 'local'));
			assert.ok(local?.samples, source.id + ' paired local result');
			assert.equal(
				local.samples.at(-1).present,
				source.samples.at(-1).present,
				source.id + ' final presence'
			);
			assert.deepEqual(
				local.samples.at(-1).events,
				source.samples.at(-1).events,
				source.id + ' final callbacks'
			);
			if (source.following)
				for (let i = 0; i < source.following.length; i++)
					assert.ok(
						Math.abs(source.following[i].position - local.following[i].position) < 0.001,
						source.id + ' pointer-following schedule'
					);
		}
	}
} finally {
	await fs.writeFile(`handoff/motion-release-${phase}.json`, JSON.stringify(report, null, 2));
	if (browser) await browser.close();
	await server.close();
}

if (report.errors.length || report.runs.some((r) => !r.pass)) process.exitCode = 1;
