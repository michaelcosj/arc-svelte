// @ts-nocheck -- Gallery integration; browser state is validated through runtime assertions.
import { createServer } from 'vite-plus';
import { chromium, expect } from './dependencies/node_modules/playwright/test.mjs';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const names =
	'hold-to-confirm elastic-slider button-group carousel swipe-actions expanding-button-group card-stack resizable-panels bottom-sheet slider user-menu confirm-morph toast-stack number-field money-input phone-input rich-text-editor floating-button-group badge button dialog theme-switch breadcrumb'.split(
		' '
	);
const result = {
	started: new Date().toISOString(),
	config: 'vite.config.ts',
	port: 5199,
	cases: [],
	serverClosed: false,
	browserClosed: false
};
let server, browser, context;
const persist = () =>
	writeFileSync('handoff/phase5-integrated-results.json', JSON.stringify(result, null, 2));
const deadline = setTimeout(() => {
	result.deadlineExceeded = true;
	persist();
	void cleanup().finally(() => process.exit(2));
}, 240000);
async function cleanup() {
	if (context) await context.close();
	context = null;
	if (browser) await browser.close();
	browser = null;
	result.browserClosed = true;
	if (server) await server.close();
	server = null;
	result.serverClosed = true;
	persist();
}
async function interact(n, p, r) {
	const c = p.locator('#preview-canvas'),
		button = (name) => p.getByRole('button', { name, exact: true });
	const text = async (sel, pattern) => expect(sel).toContainText(pattern);
	switch (n) {
		case 'hold-to-confirm': {
			const b = button('Hold to delete');
			await b.focus();
			await p.keyboard.down('Space');
			await p.waitForTimeout(1400);
			await p.keyboard.up('Space');
			await expect(button('Restore')).toBeVisible();
			await button('Restore').click();
			await expect(b).toBeEnabled();
			r.interaction = 'Space hold completes; Restore resets';
			break;
		}
		case 'elastic-slider':
		case 'slider': {
			const s = c.getByRole('slider').first();
			const before = Number(await s.getAttribute('aria-valuenow'));
			await s.focus();
			await s.press('ArrowRight');
			await expect(s).toHaveAttribute('aria-valuenow', String(before + (n === 'slider' ? 100 : 1)));
			r.interaction = 'ArrowRight increases first slider value';
			break;
		}
		case 'button-group': {
			const g = p.getByRole('group', { name: 'Document actions', exact: true }),
				bs = g.locator(':scope > [data-key]'),
				h = g.locator('.arc-button-group__highlight');
			const a = await bs.nth(0).boundingBox(),
				b = await bs.nth(2).boundingBox();
			const sample = () =>
				h.evaluate((el) => ({
					x: el.getBoundingClientRect().x,
					width: el.getBoundingClientRect().width,
					opacity: getComputedStyle(el).opacity
				}));
			await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
			await p.waitForTimeout(300);
			r.hover = { first: await sample() };
			await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
			await p.waitForTimeout(35);
			r.hover.outbound = await sample();
			await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
			await p.waitForTimeout(700);
			r.hover.reversed = await sample();
			assert.ok(Math.abs(r.hover.reversed.x - a.x) < 3, 'highlight returns to first segment');
			await p.mouse.move(1, 1);
			await p.waitForTimeout(250);
			r.hover.left = await sample();
			assert.equal(Number(r.hover.left.opacity), 0);
			await bs.nth(2).click();
			await expect(g.getByRole('button', { name: 'Restore', exact: true })).toBeVisible();
			await g.getByRole('button', { name: 'Restore', exact: true }).click();
			await expect(g.getByRole('button', { name: 'Archive', exact: true })).toBeVisible();
			r.interaction =
				'pointer hover, interrupted cross-group reversal, leave fade, Archive/Restore';
			break;
		}
		case 'carousel':
			await button('Next slide').click();
			await expect(
				p.getByRole('tab', { name: 'Stonewashed linen throw, 3 of 5', exact: true })
			).toHaveAttribute('aria-selected', 'true');
			r.interaction = 'Next slide selects third tab';
			break;
		case 'swipe-actions':
			await button('More actions for Atlas launch checklist').click();
			await p.getByRole('menuitem', { name: 'Archive', exact: true }).click();
			await expect(button('Undo')).toBeVisible();
			await text(p.getByRole('status'), 'Archived');
			await button('Undo').click();
			await expect(button('More actions for Atlas launch checklist')).toBeVisible();
			r.interaction = 'Archive via row menu and Undo';
			break;
		case 'expanding-button-group':
			await button('Reply').hover();
			await p.waitForTimeout(350);
			await button('Reply').click();
			await expect(button('Reply')).toHaveAttribute('data-state', 'done');
			await text(
				p.getByRole('toolbar', { name: 'Message actions' }).getByRole('status'),
				'Replied'
			);
			r.interaction = 'hover Reply and confirm Replied state';
			break;
		case 'card-stack':
			await button('Shortlist').click();
			await expect(button('Undo')).toBeEnabled();
			await p.waitForTimeout(600);
			await text(c, 'Copenhagen');
			await button('Undo').click();
			await p.waitForTimeout(600);
			await text(c, 'Lisbon');
			r.interaction = 'Shortlist advances and Undo restores';
			break;
		case 'resizable-panels': {
			const s = p.getByRole('separator').first();
			const old = Number(await s.getAttribute('aria-valuenow'));
			await s.focus();
			await s.press('ArrowRight');
			await p.waitForTimeout(600);
			const value = Number(await s.getAttribute('aria-valuenow'));
			assert.ok(value > old);
			r.values = { old, value };
			r.interaction = 'separator ArrowRight resizes';
			break;
		}
		case 'bottom-sheet':
			await button('View trip details').click();
			await expect(p.getByRole('dialog', { name: 'Lisbon to Copenhagen' })).toBeVisible();
			await p.keyboard.press('Escape');
			await expect(p.getByRole('dialog')).toHaveCount(0);
			r.interaction = 'open trip details and Escape closes';
			break;
		case 'user-menu': {
			const profile = p.getByRole('menuitem', { name: /Profile/ });
			if (!(await profile.isVisible())) await button('Account menu, Emma Collins').click();
			await profile.click();
			await text(p.getByRole('status'), 'Opened profile');
			r.interaction = 'Profile menu selection updates status';
			break;
		}
		case 'confirm-morph':
			await button('Delete project').click();
			await p.waitForTimeout(350);
			await button('Delete').click();
			await expect(button('Restore')).toBeVisible();
			await text(c, 'No projects');
			await button('Restore').click();
			await text(c, 'Northwind redesign');
			r.interaction = 'confirm deletion, async success and Restore';
			break;
		case 'toast-stack':
			await button('Publish release').click();
			await expect(p.locator('.arc-toast-stack__item').first()).toBeVisible();
			r.toast = await p.locator('.arc-toast-stack__item').first().innerText();
			await button('Dismiss all').click();
			await expect(p.locator('.arc-toast-stack__item')).toHaveCount(0);
			r.interaction = 'Publish toast appears and Dismiss all removes';
			break;
		case 'number-field':
			await button('Increase Seats').click();
			await expect(p.getByRole('spinbutton', { name: 'Seats', exact: true })).toHaveValue('9');
			await text(c, '$112');
			r.interaction = 'increase Seats updates value and monthly price';
			break;
		case 'money-input':
			await button('Add $10').click();
			await expect(button('Pay $70.00')).toBeEnabled();
			await button('Pay $70.00').click();
			await text(p.locator('.arc-money-input-demo__sent'), 'Sent $70.00 to Jasmine');
			r.interaction = 'quick add and successful payment status';
			break;
		case 'phone-input':
			await p.getByLabel('Mobile number', { exact: true }).fill('4155552671');
			await expect(button('Send code')).toBeEnabled();
			await button('Send code').click();
			await text(p.locator('.arc-phone-input-demo__sent'), 'Code sent to');
			r.interaction = 'valid US number enables send and displays sent status';
			break;
		case 'rich-text-editor': {
			const e = p.getByRole('textbox', { name: 'Release notes' });
			await e.click();
			await p.keyboard.press('Control+End');
			await p.keyboard.type(' Integrated smoke');
			await text(c.locator('pre code'), 'Integrated smoke');
			await button('Reset sample').click();
			await expect(c.locator('pre code')).not.toContainText('Integrated smoke');
			r.interaction = 'typed content updates Markdown output; Reset sample restores';
			break;
		}
		case 'floating-button-group': {
			const b = button('Comment').first();
			await b.hover();
			await b.click();
			await expect(b).toHaveAttribute('aria-pressed', 'true');
			await b.click();
			await expect(b).toHaveAttribute('aria-pressed', 'false');
			r.interaction = 'Comment pressed toggle on/off';
			break;
		}
		case 'badge':
			await button('Approve review').click();
			await text(c.locator('.arc-badge').filter({ hasText: 'Approved' }), 'Approved');
			await expect(button('Reopen review')).toHaveAttribute('aria-pressed', 'true');
			r.interaction = 'approve updates Badge and pressed state';
			break;
		case 'button':
			await button('Save changes').click();
			await text(p.locator('.actions-status'), 'Changes saved');
			r.interaction = 'Save changes updates status';
			break;
		case 'dialog':
			await button('Review changes').click();
			await expect(p.getByRole('dialog', { name: 'Publish workspace' })).toBeVisible();
			await button('Keep editing').click();
			await expect(p.getByRole('dialog')).toHaveCount(0);
			await expect(button('Review changes')).toBeFocused();
			r.interaction = 'open/close with focus restoration';
			break;
		case 'theme-switch': {
			const b = p.getByRole('button', { name: /Theme switcher: switch to dark mode/ });
			await b.click();
			await expect(
				p.getByRole('button', { name: /Theme switcher: switch to light mode/ })
			).toBeVisible();
			r.theme = await p.locator('html').getAttribute('data-theme');
			r.interaction = 'switch to dark updates switch accessible name';
			break;
		}
		case 'breadcrumb':
			await button('Motion pass').click();
			await text(c, 'No pages inside Motion pass');
			await button('Projects').click();
			await expect(p.getByRole('list', { name: 'Pages in Projects' })).toBeVisible();
			r.interaction = 'descend Motion pass and navigate ancestor Projects';
			break;
	}
}
try {
	server = await createServer({
		configFile: 'vite.config.ts',
		server: { host: '127.0.0.1', port: 5199, strictPort: true, watch: null }
	});
	await server.listen();
	browser = await chromium.launch();
	for (const motion of ['no-preference', 'reduce']) {
		context = await browser.newContext({
			viewport: { width: 1280, height: 1000 },
			reducedMotion: motion
		});
		for (const name of names) {
			const p = await context.newPage();
			p.setDefaultTimeout(10000);
			p.setDefaultNavigationTimeout(30000);
			const r = {
				name,
				motion,
				errors: [],
				consoleErrors: [],
				failedResponses: [],
				requestFailures: [],
				status: 'running'
			};
			result.cases.push(r);
			p.on('pageerror', (e) => r.errors.push(e.stack || e.message));
			p.on('console', (m) => {
				if (m.type() === 'error') r.consoleErrors.push(m.text());
			});
			p.on('response', (res) => {
				if (res.status() >= 400) r.failedResponses.push({ url: res.url(), status: res.status() });
			});
			p.on('requestfailed', (req) =>
				r.requestFailures.push({ url: req.url(), error: req.failure()?.errorText })
			);
			try {
				const res = await p.goto('http://127.0.0.1:5199/components/' + name);
				r.httpStatus = res.status();
				assert.equal(res.status(), 200);
				await p.waitForTimeout(2200);
				await expect(p.locator('#preview-canvas')).toBeVisible();
				assert.ok(!(await p.locator('#preview-canvas').innerText()).includes('No demo for'));
				r.rendered = true;
				await interact(name, p, r);
				await p.waitForTimeout(200);
				assert.deepEqual(r.errors, [], 'page runtime errors');
				assert.deepEqual(r.consoleErrors, [], 'console errors');
				assert.deepEqual(r.failedResponses, [], 'HTTP errors');
				r.status = 'passed';
			} catch (e) {
				r.status = 'failed';
				r.failure = e.stack;
				await p
					.screenshot({
						path: 'handoff/phase5-integrated-' + name + '-' + motion + '-failure.png',
						fullPage: true
					})
					.catch(() => {});
				r.body = await p
					.locator('body')
					.innerText()
					.catch(() => '');
			} finally {
				console.log(motion, name, r.status, r.failure?.split('\n')[0] || '');
				persist();
				await p.close();
			}
		}
		await context.close();
		context = null;
	}
} catch (e) {
	result.fatal = e.stack;
} finally {
	clearTimeout(deadline);
	await cleanup();
}
result.finished = new Date().toISOString();
result.summary = {
	passed: result.cases.filter((r) => r.status === 'passed').length,
	failed: result.cases.filter((r) => r.status === 'failed').length
};
persist();
console.log(result.summary);
if (result.fatal || result.summary.failed) process.exitCode = 1;
