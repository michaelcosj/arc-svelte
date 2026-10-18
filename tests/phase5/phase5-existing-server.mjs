// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { createServer } from 'vite-plus';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export async function start() {
	const root = process.cwd();
	const server = await createServer({
		configFile: false,
		cacheDir: 'handoff/phase5-existing-cache',
		esbuild: { jsx: 'automatic' },
		resolve: {
			conditions: ['browser', 'development', 'svelte'],
			alias: [
				{ find: '@', replacement: root + '/reference/arc-library' },
				...['react', 'react-dom', 'motion', 'lucide-react'].map((name) => ({
					find: new RegExp('^' + name + '(?=/|$)'),
					replacement: root + '/tests/phase5/dependencies/node_modules/' + name
				}))
			]
		},
		optimizeDeps: {
			noDiscovery: true,
			include: [
				'react',
				'react-dom/client',
				'react/jsx-runtime',
				'react/jsx-dev-runtime',
				'motion/react',
				'lucide-react'
			]
		},
		plugins: [
			svelte(),
			{
				name: 'existing-fixtures',
				configureServer(server) {
					server.middlewares.use((req, res, next) => {
						const url = new URL(req.url, 'http://localhost');
						if (!['/existing-react', '/existing-local'].includes(url.pathname)) return next();
						const entry =
							url.pathname === '/existing-react'
								? 'phase5-existing-react.jsx'
								: 'phase5-existing-entry.js';
						res.setHeader('Content-Type', 'text/html');
						res.end(
							`<!doctype html><html><body><div id="root"></div><script type="module" src="/tests/phase5/${entry}"></script></body></html>`
						);
					});
				}
			}
		],
		server: {
			host: '127.0.0.1',
			port: 5213,
			strictPort: true,
			hmr: false,
			watch: null,
			fs: { allow: [root] }
		}
	});
	await server.listen();
	return server;
}
