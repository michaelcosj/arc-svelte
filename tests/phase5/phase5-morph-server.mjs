// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { createServer } from 'vite-plus';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

const root = process.cwd();
export const server = await createServer({
	configFile: false,
	cacheDir: 'handoff/phase5-morph-cache',
	optimizeDeps: {
		noDiscovery: true,
		include: [
			'react',
			'react-dom',
			'react/jsx-runtime',
			'react/jsx-dev-runtime',
			'react-dom/client',
			'motion/react',
			'lucide-react',
			'@radix-ui/react-dialog',
			'@radix-ui/react-tooltip',
			'@radix-ui/react-dropdown-menu'
		]
	},
	resolve: {
		conditions: ['browser', 'development', 'svelte'],
		alias: [
			{ find: '@', replacement: path.join(root, 'reference/arc-library') },
			...[
				'react',
				'react-dom',
				'motion',
				'lucide-react',
				'@radix-ui/react-dialog',
				'@radix-ui/react-tooltip',
				'@radix-ui/react-dropdown-menu'
			].map((name) => ({
				find: new RegExp('^' + name + '(?=/|$)'),
				replacement: path.join(root, 'tests/phase5/dependencies/node_modules', name)
			}))
		]
	},
	esbuild: { jsx: 'automatic' },
	plugins: [
		svelte(),
		{
			name: 'motion-release',
			configureServer(s) {
				s.middlewares.use(async (req, res, next) => {
					if (!req.url.startsWith('/phase5-morph?')) return next();
					const ref = new URL(req.url, 'http://localhost').searchParams.get('ref') === 'true';
					res.setHeader('Content-Type', 'text/html');
					res.end(
						await s.transformIndexHtml(
							req.url,
							`<!doctype html><html><body><div id="app"></div><script type="module" src="/tests/phase5/phase5-morph-${ref ? 'react.jsx' : 'entry.js'}"></script></body></html>`
						)
					);
				});
			}
		}
	],
	publicDir: 'static',
	server: {
		host: '127.0.0.1',
		port: 5226,
		strictPort: true,
		hmr: false,
		watch: null,
		fs: { allow: [root] }
	}
});
