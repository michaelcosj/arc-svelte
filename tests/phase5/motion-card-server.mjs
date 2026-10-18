// @ts-nocheck -- Standalone browser harness; page callbacks run in the fixture window.
import { createServer } from 'vite-plus';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
export async function start() {
	return createServer({
		configFile: false,
		cacheDir: 'handoff/motion-card-5223-cache',
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
			svelte(),
			{
				name: 'motion-card-pages',
				configureServer(s) {
					s.middlewares.use((req, res, next) => {
						if (!req.url?.startsWith('/motion-card-')) return next();
						const entry = req.url.startsWith('/motion-card-ref')
							? 'motion-card-ref.jsx'
							: 'motion-card-entry.js';
						res.setHeader('Content-Type', 'text/html');
						res.end(
							`<!doctype html><html><head><style>body{padding:40px!important}#mount{margin:24px 0;min-height:60px}button{font:inherit}</style></head><body><div id="app"></div><script type="module" src="/tests/phase5/${entry}"></script></body></html>`
						);
					});
				}
			}
		],
		server: {
			host: '127.0.0.1',
			port: 5223,
			strictPort: true,
			hmr: false,
			watch: null,
			fs: { allow: [root] }
		}
	});
}
