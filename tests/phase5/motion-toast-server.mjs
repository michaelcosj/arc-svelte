// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { createServer } from 'vite-plus';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
const root = process.cwd();
export async function start() {
	const server = await createServer({
		configFile: false,
		cacheDir: 'handoff/motion-toast-cache',
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
		plugins: [
			svelte(),
			{
				name: 'motion-toast',
				configureServer(s) {
					s.middlewares.use(async (req, res, next) => {
						if (!req.url.startsWith('/motion-toast?')) return next();
						const ref = new URL(req.url, 'http://localhost').searchParams.get('ref') === 'true';
						res.setHeader('Content-Type', 'text/html');
						res.end(
							await s.transformIndexHtml(
								req.url,
								`<!doctype html><html><body><div id="app"></div><script type="module" src="/tests/phase5/motion-toast-${ref ? 'react.jsx' : 'entry.js'}"></script></body></html>`
							)
						);
					});
				}
			}
		],
		publicDir: 'static',
		server: {
			host: '127.0.0.1',
			port: 5222,
			strictPort: true,
			hmr: false,
			watch: null,
			fs: { allow: [root] }
		}
	});
	await server.listen();
	return server;
}
