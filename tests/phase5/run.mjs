import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const revision = execFileSync('git', ['-C', 'reference/arc-library', 'rev-parse', 'HEAD'], {
	encoding: 'utf8'
}).trim();
if (revision !== '86330cc9270c4acc55b7204c9583fcbaa378192c')
	throw new Error('Set up the pinned React reference described in tests/phase5/README.md.');
execFileSync('git', [
	'-C',
	'reference/arc-library',
	'diff',
	'--quiet',
	'HEAD',
	'--',
	'registry',
	'lib'
]);

// Each workflow owns and closes its Vite server. Never run sync/build beside these.
mkdirSync('handoff', { recursive: true });
const suites = [
	'phase5-highlight-trace.mjs',
	'phase5-swipe-trace.mjs',
	'phase5-carousel-trace.mjs',
	'phase5-user-clock.mjs',
	'phase5-panels-clock.mjs',
	'phase5-panels-key-regression.mjs',
	'expanding-button-group/regression.mjs',
	'phase5-ebg-clock.mjs',
	'phase5-toast-clock.mjs',
	'phase5-existing-clock.mjs',
	'phase5-digit-clock.mjs',
	'phase5-bubble-clock.mjs',
	'phase5-morph-clock.mjs',
	'motion-release-capture.mjs',
	'card-stack/motion.browser.mjs',
	'gallery.browser.mjs'
];
const from = process.argv.indexOf('--from');
const first = from < 0 ? 0 : suites.indexOf(process.argv[from + 1]);
if (first < 0) throw new Error('Unknown Phase 5 suite passed to --from.');
for (const suite of suites.slice(first)) {
	console.log(`Running ${suite}`);
	const result = spawnSync(process.execPath, [`tests/phase5/${suite}`], {
		stdio: 'inherit',
		timeout: 300000
	});
	if (result.error) throw result.error;
	if (result.status !== 0) process.exit(result.status ?? 1);
}
