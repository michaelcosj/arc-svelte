// @ts-nocheck -- Browser fixture values and DOM contracts are asserted at runtime.
import { createServer } from 'vite-plus';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium, expect } from '../phase5/dependencies/node_modules/playwright/test.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { waitForFixture } from '../phase5/fixture-ready.mjs';
const root = process.cwd(),
	report = { cases: [], errors: [], consoleErrors: [] };
const server = await createServer({
	configFile: false,
	cacheDir: 'handoff/svelte-audit/vite-cache',
	optimizeDeps: { noDiscovery: true },
	resolve: {
		conditions: ['browser', 'development', 'svelte'],
		alias: { $lib: path.join(root, 'src/lib') }
	},
	plugins: [
		svelte(),
		{
			name: 'state-audit-fixture',
			configureServer(s) {
				s.middlewares.use(async (req, res, next) => {
					if (req.url !== '/svelte-state') return next();
					res.setHeader('Content-Type', 'text/html');
					res.end(
						await s.transformIndexHtml(
							req.url,
							'<!doctype html><html><body><div id="app"></div><script type="module" src="/tests/svelte-state/entry.js"></script></body></html>'
						)
					);
				});
			}
		}
	],
	publicDir: 'static',
	server: { host: '127.0.0.1', port: 5232, strictPort: true, hmr: false, watch: null }
});
let browser;
try {
	await server.listen();
	const { default: Fixture } = await server.ssrLoadModule('/tests/svelte-state/Fixture.svelte');
	const { render } = await server.ssrLoadModule('svelte/server');
	const html = render(Fixture).body;
	assert.match(html, /Old message/);
	assert.match(html, /First panel/);
	report.cases.push({ name: 'SSR renders initial values and tears down safely' });
	browser = await chromium.launch();
	const readiness = await browser.newPage();
	await readiness.clock.install({ time: new Date('2026-01-01') });
	await readiness.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
	await readiness.evaluate(() => {
		Object.defineProperty(window, 'fixture', {
			configurable: true,
			get() {
				window.fixtureRead = true;
				return window.readyValue;
			}
		});
	});
	const ready = waitForFixture(readiness);
	await expect.poll(() => readiness.evaluate(() => !!window.fixtureRead)).toBe(true);
	await readiness.evaluate(() => {
		window.readyValue = {};
	});
	await ready;
	report.cases.push({ name: 'fixture readiness progresses while RAF is paused' });
	await readiness.close();
	for (const reducedMotion of ['no-preference', 'reduce']) {
		const p = await browser.newPage({ viewport: { width: 900, height: 1000 }, reducedMotion });
		p.on('pageerror', (e) => report.errors.push(e.message));
		p.on('console', (m) => {
			if (m.type() === 'error') {
				report.consoleErrors.push(m.text());
				console.error(m.text());
			}
		});
		await p.goto('http://127.0.0.1:5232/svelte-state');
		await p.waitForFunction(() => !!window.svelteAudit);
		await p.evaluate(() => document.fonts.ready);
		const record = (name) => {
			report.cases.push({ name, reducedMotion });
			console.log(reducedMotion, name, 'PASS');
		};

		assert.deepEqual(await p.evaluate(() => window.svelteAudit.numberThenIncrement(20)), {
			value: 21,
			proposal: 21
		});
		await expect(p.getByRole('spinbutton', { name: 'Count', exact: true })).toHaveValue('21');
		assert.deepEqual(await p.evaluate(() => window.svelteAudit.numberThenIncrement(30, true)), {
			value: 30,
			proposal: 31
		});
		await expect(p.getByRole('spinbutton', { name: 'Count', exact: true })).toHaveValue('30');
		record('same-tick external number update, increment and controlled rejection');

		assert.equal(
			await p.evaluate(() => window.svelteAudit.mentionThenSubmit('New message')),
			'New message'
		);
		const message = p.getByRole('combobox', { name: 'Message', exact: true });
		await expect(message).toHaveValue('New message');
		record('same-tick external mention value and submission');
		await message.fill('@');
		await expect(p.getByRole('option')).toHaveCount(2);
		await message.press('ArrowDown');
		await expect(p.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
		await message.fill('@A');
		await expect(p.getByRole('option').nth(0)).toHaveAttribute('aria-selected', 'true');
		await message.press('Escape');
		await expect(message).toHaveAttribute('aria-expanded', 'false');
		await message.fill('@Al');
		await expect(message).toHaveAttribute('aria-expanded', 'false');
		await message.fill('hello @');
		await expect(message).toHaveAttribute('aria-expanded', 'true');
		await message.fill('@');
		await expect(message).toHaveAttribute('aria-expanded', 'true');
		await message.press('Escape');
		record('query resets navigation; dismissal survives query edits and resets at another trigger');

		await p.evaluate(() => window.svelteAudit.setMoney(2500));
		const amount = p.getByRole('spinbutton', { name: 'Amount', exact: true });
		await expect(amount).toHaveValue('25.00');
		await amount.press('ArrowUp');
		await expect.poll(() => p.evaluate(() => window.svelteAudit.money)).toBe(2600);
		await p.evaluate(() => window.svelteAudit.setMoney(3000, true));
		await expect(amount).toHaveValue('30.00');
		await amount.press('ArrowUp');
		await expect(amount).toHaveValue('30.00');
		await expect.poll(() => p.evaluate(() => window.svelteAudit.moneyChanges.at(-1))).toBe(3100);
		record('money external values, key increments and rejected edits');

		for (const [selection, label] of [
			['c', 'Gamma'],
			['b', 'Beta'],
			['a', 'Alpha']
		]) {
			await p.evaluate((next) => window.svelteAudit.setSelection(next), selection);
			await expect(p.getByRole('combobox', { name: 'Choice', exact: true })).toContainText(label);
		}
		for (const [time, label] of [
			['10:00', '10:00 AM'],
			['08:00', '8:00 AM'],
			['09:00', '9:00 AM']
		]) {
			await p.evaluate((next) => window.svelteAudit.setTime(next), time);
			await expect(p.locator('.arc-time-picker__trigger')).toContainText(label);
		}
		record('Select and TimePicker external changes and reversals');

		await p.evaluate(() => window.svelteAudit.setOtp('9876'));
		await expect(p.locator('.arc-otp-input__input')).toHaveCount(4);
		for (let i = 0; i < 4; i++)
			await expect(p.locator('.arc-otp-input__input').nth(i)).toHaveValue('9876'[i]);
		await p.evaluate(() => window.svelteAudit.setOtp('1276'));
		await expect(p.locator('.arc-otp-input__input').nth(0)).toHaveValue('1');
		record('OTP multiple-digit updates and reversal');

		await p.evaluate(() => window.svelteAudit.setWords('Copied'));
		await expect(p.locator('[data-copy] button')).toHaveAttribute('aria-label', 'Copied');
		await expect(p.locator('[data-morph] .arc-text-morph__sr-only')).toHaveText('Copied');
		await p.evaluate(() => window.svelteAudit.setWords('Copy'));
		await expect(p.locator('[data-copy] .arc-copy-button__glyphs > span:not([inert])')).toHaveCount(
			4
		);
		await expect(p.locator('[data-morph] .arc-text-morph__glyph:not([inert])')).toHaveCount(4);
		await p.evaluate(() => window.svelteAudit.setDate(20));
		await expect(p.locator('.arc-calendar [aria-selected=true]')).toContainText('20');
		await p.evaluate(() => window.svelteAudit.setDate(20));
		await expect
			.poll(() =>
				p
					.locator('.arc-calendar [aria-selected=true]')
					.evaluate((el) => el.style.getPropertyValue('--number-delay'))
			)
			.toBe('');
		await p.evaluate(() => window.svelteAudit.setDate(12));
		await expect(p.locator('.arc-calendar [aria-selected=true]')).toContainText('12');
		record('glyph and calendar selection history survive interrupted reversal');

		await p.getByRole('tab', { name: 'Second', exact: true }).click();
		await expect(p.getByRole('tabpanel', { name: 'Second', exact: true })).toBeVisible();
		await p.getByRole('tab', { name: 'First', exact: true }).click();
		await expect(p.getByRole('tabpanel', { name: 'First', exact: true })).toBeVisible();
		record('Tabs context ref resolves at selection time');

		await p
			.locator('input[type=file]')
			.setInputFiles({ name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('test') });
		await expect.poll(() => p.evaluate(() => window.svelteAudit.uploadAborted)).toBe(false);
		await p.evaluate(() => window.svelteAudit.unmountUpload());
		await expect.poll(() => p.evaluate(() => window.svelteAudit.uploadAborted)).toBe(true);
		record('onDestroy aborts pending upload on unmount');
		await p.close();
	}
	assert.deepEqual(report.errors, []);
	assert.deepEqual(report.consoleErrors, []);
} finally {
	await browser?.close();
	await server.close();
	await mkdir('handoff/svelte-audit', { recursive: true });
	await writeFile('handoff/svelte-audit/browser.json', JSON.stringify(report, null, 2));
}
