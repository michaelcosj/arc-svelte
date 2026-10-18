// @ts-nocheck -- Browser verification harness; browser globals are provided by the fixtures.
import { createServer } from 'vite-plus';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../../', import.meta.url));
export async function start() {
	return createServer({
		configFile: false,
		cacheDir: 'handoff/motion-ebg-fix-cache',
		resolve: {
			conditions: ['browser', 'development', 'svelte'],
			alias: [
				{ find: '@', replacement: path.join(root, 'reference/arc-library') },
				...['react', 'react-dom', 'motion', 'lucide-react'].map((name) => ({
					find: new RegExp('^' + name + '(?=/|$)'),
					replacement: path.join(root, 'tests/phase5/dependencies/node_modules', name)
				}))
			]
		},
		esbuild: { jsx: 'automatic' },
		optimizeDeps: {
			noDiscovery: true,
			include: [
				'react',
				'react/jsx-runtime',
				'react/jsx-dev-runtime',
				'react-dom/client',
				'motion/react',
				'lucide-react'
			]
		},
		plugins: [
			{
				name: 'ebg-baseline-only',
				enforce: 'pre',
				load(id) {
					if (
						process.env.EBG_BASELINE === '1' &&
						id === path.join(root, 'src/lib/components/expanding-button-group/ExpandingItem.svelte')
					) {
						return execFileSync(
							'git',
							[
								'--no-pager',
								'show',
								'HEAD:src/lib/components/expanding-button-group/ExpandingItem.svelte'
							],
							{ cwd: root, encoding: 'utf8' }
						);
					}
				}
			},
			svelte(),
			{
				name: 'ebg-pages',
				configureServer(s) {
					s.middlewares.use((req, res, next) => {
						if (!req.url?.startsWith('/ebg-')) return next();
						const entry = req.url.startsWith('/ebg-ref') ? 'reference.jsx' : 'entry.js';
						res.setHeader('Content-Type', 'text/html');
						res.end(
							`<!doctype html><html><head><style>body{padding:40px!important}#mount{margin:24px 0;min-height:60px}button{font:inherit}</style></head><body><div id="app"></div><script type="module" src="/tests/phase5/expanding-button-group/${entry}"></script></body></html>`
						);
					});
				}
			}
		],
		server: {
			host: '127.0.0.1',
			port: 5221,
			strictPort: true,
			hmr: false,
			watch: null,
			fs: { allow: [root] }
		}
	});
}
