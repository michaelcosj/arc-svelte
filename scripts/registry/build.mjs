import { readFile, readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parse } from 'svelte/compiler';
import { registryItemSchema, registrySchema, registryIndexSchema } from 'shadcn-svelte/schema';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const library = path.join(projectRoot, 'src/lib');
const homepage = 'https://github.com/michaelcosj/arc-svelte';
const schema = 'https://shadcn-svelte.com/schema/registry-item.json';
const banner =
	'Arc for Svelte — MIT. Original Arc: Elia Kuratli. Svelte port: Michael and contributors. See arc/LICENSE.txt.';
/** @param {string} a @param {string} b */
const compare = (a, b) => a.localeCompare(b, 'en');
/** @param {string} value */
const slash = (value) => value.split(path.sep).join('/');
/** @param {string} file */
const groupFor = (file) =>
	slash(path.relative(library, file)).match(/^components\/([^/]+)\//)?.[1] ?? 'arc-core';
/** @param {string} file */
const targetFor = (file) => `arc/${slash(path.relative(library, file))}`;

/** @param {string} directory @returns {Promise<string[]>} */
async function sourceFiles(directory) {
	const files = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const file = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await sourceFiles(file)));
		else if (/\.(?:svelte|ts|css)$/.test(file) && !/\.(?:test|spec)\.ts$/.test(file))
			files.push(file);
	}
	return files.sort(compare);
}

/**
 * Inspect module specifiers, including type imports, without rewriting strings or comments.
 * @param {string} code
 * @param {string} filename
 */
export function moduleReferences(code, filename) {
	/** @type {[number, number][]} */
	const ranges = [];
	if (filename.endsWith('.svelte')) {
		const ast = parse(code, { modern: true });
		for (const script of [ast.module, ast.instance]) {
			if (script) {
				// Svelte supplies positions that the upstream ESTree Program type omits.
				const content =
					/** @type {typeof script.content & import('svelte/compiler').AST.BaseNode} */ (
						script.content
					);
				ranges.push([content.start, content.end]);
			}
		}
	} else if (filename.endsWith('.ts')) ranges.push([0, code.length]);
	/** @type {{specifier: string, start: number, end: number}[]} */
	const references = [];
	for (const [start, end] of ranges) {
		const source = ts.createSourceFile(
			filename + '.ts',
			code.slice(start, end),
			ts.ScriptTarget.Latest,
			true
		);
		/** @param {import('typescript').Node | undefined} node */
		const add = (node) => {
			if (node && ts.isStringLiteralLike(node)) {
				references.push({
					specifier: node.text,
					start: start + node.getStart(source) + 1,
					end: start + node.end - 1
				});
			}
		};
		/** @param {import('typescript').Node} node */
		const visit = (node) => {
			if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier);
			else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
				add(node.argument.literal);
			else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
				add(node.arguments[0]);
			ts.forEachChild(node, visit);
		};
		visit(source);
	}
	return references;
}

/** @param {string} specifier @param {string} importer */
function resolveLocal(specifier, importer) {
	let candidate;
	if (specifier.startsWith('.')) candidate = path.resolve(path.dirname(importer), specifier);
	else if (specifier === '#lib') candidate = path.join(library, 'index.ts');
	else if (specifier.startsWith('#lib/')) candidate = path.join(library, specifier.slice(5));
	else if (specifier.startsWith('#arc/'))
		candidate = path.join(library, 'components', specifier.slice(5), 'index.ts');
	else if (specifier.startsWith('#') || specifier.startsWith('$'))
		throw new Error(`Unsupported application alias ${specifier} in ${importer}`);
	else return null;
	const candidates = [
		candidate,
		`${candidate}.ts`,
		`${candidate}.svelte`,
		`${candidate}.css`,
		path.join(candidate, 'index.ts')
	];
	if (candidate.endsWith('.js')) candidates.push(candidate.slice(0, -3) + '.ts');
	const resolved = candidates.find((file) => existsSync(file) && /\.(?:ts|svelte|css)$/.test(file));
	if (!resolved || !resolved.startsWith(library + path.sep))
		throw new Error(`Cannot resolve ${specifier} from ${importer}`);
	return resolved;
}

/** @param {string} specifier */
function packageName(specifier) {
	return specifier.startsWith('@')
		? specifier.split('/').slice(0, 2).join('/')
		: specifier.split('/')[0];
}

export async function createRegistry() {
	const pkg = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
	const names = (await readdir(path.join(library, 'components')))
		.filter((name) => existsSync(path.join(library, 'components', name, 'index.ts')))
		.sort(compare);
	const files = await sourceFiles(library);
	const sources = new Map();
	for (const file of files) {
		const code = await readFile(file, 'utf8');
		const references = moduleReferences(code, file).map((reference) => ({
			...reference,
			local: resolveLocal(reference.specifier, file)
		}));
		sources.set(file, { code, references });
	}
	/** @param {string} file */
	const getSource = (file) => {
		const source = sources.get(file);
		if (!source) throw new Error(`Missing library source: ${file}`);
		return source;
	};
	const groups = new Map(
		names.map((name) => [name, files.filter((file) => groupFor(file) === name)])
	);
	// Include only shared code reachable from component files or the public provider API.
	const core = new Set([path.join(library, 'foundation.css'), path.join(library, 'arc/index.ts')]);
	for (const [file, { references }] of sources) {
		if (groupFor(file) !== 'arc-core')
			for (const ref of references)
				if (ref.local && groupFor(ref.local) === 'arc-core') core.add(ref.local);
	}
	for (const file of core) {
		for (const ref of getSource(file).references)
			if (ref.local) {
				if (groupFor(ref.local) !== 'arc-core')
					throw new Error('Shared core must not depend on components');
				core.add(ref.local);
			}
	}
	groups.set('arc-core', [...core].sort(compare));
	/** @type {import('shadcn-svelte/schema').RegistryItem[]} */
	const items = [];
	for (const [name, groupFiles] of groups) {
		const dependencies = new Set();
		const registryDependencies = new Set(name === 'arc-core' ? [] : ['./arc-core.json']);
		const payload = [];
		for (const file of groupFiles) {
			const { code, references } = getSource(file);
			let content = code;
			for (const ref of [...references].reverse()) {
				if (ref.local) {
					const dependency = groupFor(ref.local);
					if (dependency !== name) registryDependencies.add(`./${dependency}.json`);
					let relative = slash(path.relative(path.dirname(targetFor(file)), targetFor(ref.local)));
					if (!relative.startsWith('.')) relative = './' + relative;
					content = content.slice(0, ref.start) + relative + content.slice(ref.end);
				} else {
					const dependency = packageName(ref.specifier);
					if (dependency === 'svelte') continue;
					const version = pkg.dependencies?.[dependency] ?? pkg.devDependencies[dependency];
					if (!version || version === 'catalog:')
						throw new Error(`Unversioned package ${dependency} in ${file}`);
					dependencies.add(`${dependency}@${version}`);
				}
			}
			if (file === path.join(library, 'components', name, 'index.ts'))
				content = `import '../../styles.css';\n${content}`;
			const prefix = file.endsWith('.svelte') ? `<!-- ${banner} -->` : `/* ${banner} */`;
			payload.push({
				type: 'registry:lib',
				target: targetFor(file),
				content: `${prefix}\n${content}`
			});
		}
		if (name === 'arc-core') {
			dependencies.add(`svelte@${pkg.devDependencies.svelte}`);
			for (const font of ['inter', 'geist'])
				dependencies.add(
					`@fontsource-variable/${font}@${pkg.devDependencies[`@fontsource-variable/${font}`]}`
				);
			payload.push({
				type: 'registry:lib',
				target: 'arc/styles.css',
				content: `/* ${banner} */\n@import '@fontsource-variable/inter';\n@import '@fontsource-variable/geist';\n@import './foundation.css';\n`
			});
			const notice = await readFile(path.join(projectRoot, 'LICENSE'), 'utf8');
			const upstream = await readFile(
				path.join(projectRoot, 'LICENSES/arc-library-MIT.txt'),
				'utf8'
			);
			payload.push({
				type: 'registry:lib',
				target: 'arc/LICENSE.txt',
				content: `${notice}\n\nUpstream Arc license:\n\n${upstream}\n\nFonts and icons retain their package licenses.\n`
			});
		}
		const item = {
			$schema: schema,
			name,
			type: name === 'arc-core' ? 'registry:lib' : 'registry:ui',
			title:
				name === 'arc-core'
					? 'Arc shared foundation'
					: name
							.split('-')
							.map((word) => word[0].toUpperCase() + word.slice(1))
							.join(' '),
			description:
				name === 'arc-core'
					? 'Shared native motion, provider API, design tokens, fonts and MIT notices.'
					: `Arc ${name} for Svelte 5.`,
			dependencies: [...dependencies].sort(compare),
			registryDependencies: [...registryDependencies].sort(compare),
			files: payload,
			docs: `Requires Svelte >=5.57.1 and TypeScript. Styles and fonts load through the component entry point. ${homepage}`
		};
		registryItemSchema.parse(item);
		items.push(registryItemSchema.parse(item));
	}
	items.sort((a, b) => a.name.localeCompare(b.name));
	const all = {
		$schema: schema,
		name: 'all',
		type: 'registry:lib',
		title: 'All Arc components',
		description: 'Install every implemented Arc component and the shared foundation.',
		registryDependencies: names.map((name) => `./${name}.json`)
	};
	registryItemSchema.parse(all);
	items.push(registryItemSchema.parse(all));
	const manifest = {
		$schema: 'https://shadcn-svelte.com/schema/registry.json',
		name: 'arc-svelte',
		homepage,
		items: items.map(({ files = [], ...item }) => ({
			...item,
			files: files.map(({ target, type }) => ({ path: target, type, target }))
		}))
	};
	registrySchema.parse(manifest);
	return { items, manifest };
}

/** @type {Record<string, string>} */
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** @param {string} text */
const escapeHtml = (text) =>
	text.replace(/[&<>"']/g, (character) => entities[character] ?? character);
/** @param {import('shadcn-svelte/schema').RegistryItem[]} items */
function indexHtml(items) {
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Arc for Svelte registry</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:70rem;margin:auto;padding:2rem;color:#18181b;background:#fafafa}h1{line-height:1.15}a{color:#4338ca}code{overflow-wrap:anywhere}li{break-inside:avoid;margin:.5rem 0}ul{columns:16rem}input{font:inherit;padding:.5rem;width:min(100%,28rem);box-sizing:border-box}pre{padding:1rem;background:#eee;white-space:pre-wrap}small{color:#52525b}</style></head>
<body><h1>Arc for Svelte</h1><p>An independent Svelte 5 port of <a href="https://uiarc.dev">Arc UI</a> by Elia Kuratli. MIT licensed.</p>
<p>Install into a Svelte 5.57.1+ TypeScript project initialized with shadcn-svelte. Components include their CSS, motion helpers and dependencies; no React runtime is installed.</p>
<pre><code id="install">vp dlx -- shadcn-svelte@1.7.0 add ./r/button.json</code></pre>
<p>Import from your configured lib alias: <code>import { Button } from '$lib/arc/components/button/index.ts';</code></p>
<p>Entry points load Arc fonts and foundation CSS automatically, including global design tokens. Use <code>data-theme="dark"</code> on the document root for dark mode. Installed code is yours to edit; retain <code>arc/LICENSE.txt</code>.</p>
<p><a href="${homepage}">Source, demos and verification status</a> · <a href="registry.json">Registry index</a> · <a href="r/all.json">Install all components</a></p>
<h2>Components</h2><label for="search">Filter components</label><br><input id="search" type="search" placeholder="Search by name"><ul>${items
		.filter((item) => !['arc-core', 'all'].includes(item.name))
		.map(
			(item) =>
				`<li><a href="r/${item.name}.json">${escapeHtml(item.title ?? item.name)}</a> <small>${escapeHtml(item.name)}</small></li>`
		)
		.join('')}</ul>
<script>document.querySelector('#install').textContent='vp dlx -- shadcn-svelte@1.7.0 add '+new URL('r/button.json',location.href).href;document.querySelector('#search').addEventListener('input',event=>{for(const row of document.querySelectorAll('li'))row.hidden=!row.textContent.toLowerCase().includes(event.target.value.toLowerCase())});</script></body></html>\n`;
}

export async function buildRegistry(output = path.join(projectRoot, 'registry-dist')) {
	const { items, manifest } = await createRegistry();
	// Only replace our generated r/ subtree; preserve unrelated files in a caller's output.
	await rm(path.join(output, 'r'), { recursive: true, force: true });
	await mkdir(path.join(output, 'r'), { recursive: true });
	for (const item of items)
		await writeFile(
			path.join(output, 'r', `${item.name}.json`),
			JSON.stringify(item, null, 2) + '\n'
		);
	const index = items.map(({ files: _files, docs: _docs, $schema: _schema, ...item }) => ({
		...item,
		relativeUrl: `./${item.name}.json`
	}));
	registryIndexSchema.parse(index);
	await writeFile(path.join(output, 'r/index.json'), JSON.stringify(index, null, 2) + '\n');
	await writeFile(path.join(output, 'registry.json'), JSON.stringify(manifest, null, 2) + '\n');
	await writeFile(path.join(output, 'index.html'), indexHtml(items));
	await writeFile(path.join(output, '.nojekyll'), '');
	return { output, components: items.length - 2, items: items.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
	console.log(await buildRegistry(process.argv[2] ? path.resolve(process.argv[2]) : undefined));
