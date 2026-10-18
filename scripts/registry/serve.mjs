import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectRoot } from './build.mjs';

export async function serveRegistry(directory, { port = 5300, host = '127.0.0.1' } = {}) {
	const root = path.resolve(directory);
	const server = createServer(async (request, response) => {
		try {
			if (!['GET', 'HEAD'].includes(request.method)) {
				response.writeHead(405).end();
				return;
			}
			const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
			const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
			if (!file.startsWith(root + path.sep)) {
				response.writeHead(403).end();
				return;
			}
			const content = await readFile(file);
			response.writeHead(200, {
				'Content-Type': file.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-cache'
			});
			response.end(request.method === 'HEAD' ? undefined : content);
		} catch {
			response.writeHead(404).end('Not found');
		}
	});
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, host, resolve);
	});
	const url = `http://${host}:${server.address().port}`;
	return { server, url };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await readFile(path.join(projectRoot, 'registry-dist/index.html'));
	const { url } = await serveRegistry(path.join(projectRoot, 'registry-dist'), {
		port: Number(process.env.PORT ?? 5300),
		host: process.env.HOST ?? '127.0.0.1'
	});
	console.log(`Arc registry: ${url}`);
}
