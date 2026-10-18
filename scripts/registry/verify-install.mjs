import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildRegistry, projectRoot } from './build.mjs';
import { serveRegistry } from './serve.mjs';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const base = path.join(projectRoot, 'handoff/registry');
await mkdir(base, { recursive: true });
const consumer = await mkdtemp(path.join(tmpdir(), 'arc-registry-'));
const site = path.join(consumer, 'registry-site');
await buildRegistry(path.join(site, 'arc-svelte'));
const { server, url: origin } = await serveRegistry(site, { port: 0 });
const url = origin + '/arc-svelte';
async function run(command, args) {
	console.log(`> ${command} ${args.join(' ')}`);
	await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: consumer,
			stdio: 'inherit',
			env: { ...process.env, COMPONENTS_REGISTRY_URL: `${url}/r` }
		});
		child.once('error', reject);
		child.once('exit', (code) =>
			code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))
		);
	});
}
const write = async (file, content) => {
	await mkdir(path.dirname(path.join(consumer, file)), { recursive: true });
	await writeFile(path.join(consumer, file), content);
};
const json = (value) => JSON.stringify(value, null, 2) + '\n';
try {
	await write(
		'pnpm-workspace.yaml',
		"overrides:\n  vite: 'npm:@voidzero-dev/vite-plus-core@1.1.0'\n"
	);
	// A non-default lib alias and directory prove the payloads do not depend on this checkout.
	await write(
		'package.json',
		json({
			name: 'arc-registry-consumer',
			private: true,
			type: 'module',
			scripts: { check: 'svelte-check --tsconfig ./tsconfig.json', build: 'vp build' },
			dependencies: {
				svelte: JSON.parse(await readFile(require.resolve('svelte/package.json'), 'utf8')).version
			},
			devDependencies: {
				'vite-plus': '1.1.0',
				vite: 'npm:@voidzero-dev/vite-plus-core@1.1.0',
				'@sveltejs/vite-plugin-svelte': pkg.devDependencies['@sveltejs/vite-plugin-svelte'],
				'svelte-check': pkg.devDependencies['svelte-check'],
				typescript: pkg.devDependencies.typescript,
				'@types/node': pkg.devDependencies['@types/node']
			}
		})
	);
	await write(
		'tsconfig.json',
		json({
			compilerOptions: {
				target: 'ESNext',
				module: 'ESNext',
				moduleResolution: 'bundler',
				strict: true,
				allowJs: true,
				checkJs: false,
				skipLibCheck: true,
				allowImportingTsExtensions: true,
				noEmit: true,
				verbatimModuleSyntax: true,
				types: ['svelte', 'vite/client'],
				paths: { $library: ['./src/shared'], '$library/*': ['./src/shared/*'] }
			},
			include: ['src/**/*.ts', 'src/**/*.svelte']
		})
	);
	await write(
		'components.json',
		json({
			$schema: 'https://shadcn-svelte.com/schema.json',
			style: 'default',
			tailwind: { css: 'src/app.css', baseColor: 'neutral' },
			aliases: {
				lib: '$library',
				components: '$library/components',
				ui: '$library/components/ui',
				hooks: '$library/hooks',
				utils: '$library/utils'
			},
			typescript: true,
			registry: 'https://shadcn-svelte.com/registry'
		})
	);
	await write(
		'vite.config.ts',
		`import {defineConfig} from 'vite-plus';\nimport {svelte} from '@sveltejs/vite-plugin-svelte';\nimport {fileURLToPath} from 'node:url';\nexport default defineConfig({plugins:[svelte()],resolve:{alias:{$library:fileURLToPath(new URL('./src/shared',import.meta.url))}}});\n`
	);
	await write(
		'index.html',
		'<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Registry consumer</title></head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>'
	);
	await write('src/app.css', '/* Consumer styles. No Tailwind or Arc aliases are required. */\n');
	await write('src/shared/.gitkeep', '');
	await write(
		'src/main.ts',
		"import {mount} from 'svelte';import App from './App.svelte';mount(App,{target:document.getElementById('app')!});\n"
	);
	const cli = path.join(path.dirname(require.resolve('shadcn-svelte/schema')), '../index.mjs');
	// The CLI always fetches its index, even for full URLs. Its supported index
	// override keeps this test independent of the public shadcn registry.
	// Start with one item to prove dependency installation is selective.
	await run(process.execPath, [
		cli,
		'add',
		`${url}/r/button.json`,
		'--cwd',
		consumer,
		'--yes',
		'--no-deps-install',
		'--skip-preflight'
	]);
	await readFile(path.join(consumer, 'src/shared/arc/components/button/Button.svelte'));
	await readFile(path.join(consumer, 'src/shared/arc/LICENSE.txt'));
	console.log('Single Button installation and shared notices PASS');
	await run(process.execPath, [
		cli,
		'add',
		`${url}/r/all.json`,
		'--cwd',
		consumer,
		'--yes',
		'--overwrite',
		'--no-deps-install',
		'--skip-preflight'
	]);
	const { items } = await import('./build.mjs').then((module) => module.createRegistry());
	const components = items.filter((item) => item.type === 'registry:ui');
	const imports = components
		.map(
			(item, index) =>
				`import * as component${index} from '$library/arc/components/${item.name}/index.ts';`
		)
		.join('\n');
	await write(
		'src/App.svelte',
		`<script lang="ts">\n${imports}\nimport { Button } from '$library/arc/components/button/index.ts';\nconst modules=[${components.map((_, index) => `component${index}`).join(',')}];\n</script><h1>Installed {modules.length} Arc components</h1><Button label="Registry works" />\n`
	);
	const defaultPackage = JSON.parse(await readFile(path.join(consumer, 'package.json'), 'utf8'));
	assert(
		!Object.keys({ ...defaultPackage.dependencies, ...defaultPackage.devDependencies }).some(
			(name) => name.startsWith('@fontsource')
		)
	);
	await run('vp', ['install', '--no-frozen-lockfile']);
	await run('vp', ['run', 'check']);
	await run('vp', ['run', 'build']);
	console.log('All components build without font packages PASS');
	await run(process.execPath, [
		cli,
		'add',
		`${url}/r/arc-fonts.json`,
		'--cwd',
		consumer,
		'--yes',
		'--overwrite',
		'--no-deps-install',
		'--skip-preflight'
	]);
	const fontPackage = JSON.parse(await readFile(path.join(consumer, 'package.json'), 'utf8'));
	for (const font of ['inter', 'geist'])
		assert(fontPackage.dependencies[`@fontsource-variable/${font}`]);
	const entry = await readFile(path.join(consumer, 'src/main.ts'), 'utf8');
	await write('src/main.ts', "import '$library/arc/fonts.css';\n" + entry);
	await run('vp', ['install', '--no-frozen-lockfile']);
	await run('vp', ['run', 'build']);
	console.log('Optional Inter/Geist installation and CSS activation PASS');
	await writeFile(
		path.join(base, 'latest.json'),
		json({ consumer, components: components.length, passed: true, optionalFonts: true })
	);
	console.log(
		`PASS: Button and all ${components.length} components installed with the real CLI; fresh consumer type check and build passed.\nFixture: ${consumer}`
	);
} finally {
	await new Promise((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve()))
	);
}
