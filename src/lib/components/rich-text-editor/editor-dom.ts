export type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'blockquote' | 'pre' | 'hr';

export const ZWSP = /\u200b/g;
export const escapeHtml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const safeUrl = (url: string) => /^(https?:|mailto:|tel:|\/|#)/i.test(url.trim());

/** Adds a scheme to bare domains so `example.com/docs` becomes a working link. */
export function normalizeUrl(input: string) {
	const url = input.trim();
	if (!url) return '';
	if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('/') || url.startsWith('#')) return url;
	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
	return `https://${url}`;
}

export function inlineMarkdown(text: string) {
	const codes: string[] = [];
	let out = escapeHtml(text).replace(
		/`([^`]+)`/g,
		(_, code: string) => `\u0000${codes.push(code) - 1}\u0000`
	);
	out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) =>
		safeUrl(url) ? `<a href="${url}">${label}</a>` : label
	);
	out = out.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '<strong>$2</strong>');
	out = out.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<s>$1</s>');
	out = out.replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\*)/g, '$1<em>$2</em>');
	out = out.replace(/(^|[^\w_])_(?=\S)([^_]*?\S)_(?![\w_])/g, '$1<em>$2</em>');
	return out.replace(
		// eslint-disable-next-line no-control-regex -- Null sentinels protect inline code from mark parsing, matching the source converter.
		/\u0000(\d+)\u0000/g,
		(_, index: string) => `<code>${codes[Number(index)]}</code>`
	);
}

export function listMarkdown(lines: string[]) {
	const items = lines.map((line) => {
		const match = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line)!;
		return {
			indent: match[1]!.replace(/\t/g, '  ').length,
			tag: /\d/.test(match[2]!) ? 'ol' : 'ul',
			text: match[3]!
		};
	});
	let html = '';
	const stack: { indent: number; tag: string }[] = [];
	for (const item of items) {
		while (stack.length > 1 && item.indent < stack[stack.length - 1]!.indent)
			html += `</li></${stack.pop()!.tag}>`;
		const top = stack[stack.length - 1];
		if (!top || item.indent > top.indent) {
			html += `<${item.tag}><li>`;
			stack.push({ indent: item.indent, tag: item.tag });
		} else if (top.tag !== item.tag) {
			html += `</li></${top.tag}><${item.tag}><li>`;
			top.tag = item.tag;
		} else html += '</li><li>';
		html += inlineMarkdown(item.text);
	}
	while (stack.length) html += `</li></${stack.pop()!.tag}>`;
	return html;
}

/** Converts Markdown to the editor's HTML: headings (three levels), lists, quotes, fenced code, rules, and inline marks. */
export function markdownToHtml(markdown: string) {
	const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
	const out: string[] = [];
	const paragraph: string[] = [];
	const flush = () => {
		if (paragraph.length) {
			out.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
			paragraph.length = 0;
		}
	};
	const isItem = (line: string) => /^\s*([-*+]|\d+[.)])\s+/.test(line);
	for (let index = 0; index < lines.length;) {
		const line = lines[index]!;
		if (/^\s*```/.test(line)) {
			flush();
			const code: string[] = [];
			index++;
			while (index < lines.length && !/^\s*```/.test(lines[index]!)) code.push(lines[index++]!);
			index++;
			out.push(`<pre>${escapeHtml(code.join('\n')) || '<br>'}</pre>`);
			continue;
		}
		if (!line.trim()) {
			flush();
			index++;
			continue;
		}
		const heading = /^(#{1,6})\s+(.*)$/.exec(line);
		if (heading) {
			flush();
			const level = Math.min(3, heading[1]!.length);
			out.push(`<h${level}>${inlineMarkdown(heading[2]!)}</h${level}>`);
			index++;
			continue;
		}
		if (/^ {0,3}([-*_])( *\1){2,} *$/.test(line)) {
			flush();
			out.push('<hr>');
			index++;
			continue;
		}
		if (/^\s*>/.test(line)) {
			flush();
			const quote: string[] = [];
			while (index < lines.length && /^\s*>/.test(lines[index]!))
				quote.push(lines[index++]!.replace(/^\s*>\s?/, ''));
			out.push(`<blockquote>${quote.map(inlineMarkdown).join('<br>')}</blockquote>`);
			continue;
		}
		if (isItem(line)) {
			flush();
			const items: string[] = [];
			while (index < lines.length && isItem(lines[index]!)) items.push(lines[index++]!);
			out.push(listMarkdown(items));
			continue;
		}
		paragraph.push(line.trim());
		index++;
	}
	flush();
	return out.join('') || '<p><br></p>';
}

export function wrapMark(inner: string, mark: string) {
	const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)!;
	return match[2] ? `${match[1]}${mark}${match[2]}${mark}${match[3]}` : inner;
}

export function inlineToMarkdown(node: Node): string {
	let out = '';
	node.childNodes.forEach((child) => {
		if (child.nodeType === Node.TEXT_NODE) {
			out += (child as Text).data.replace(ZWSP, '');
			return;
		}
		if (child.nodeType !== Node.ELEMENT_NODE) return;
		const element = child as HTMLElement;
		switch (element.nodeName) {
			case 'BR':
				out += '\n';
				break;
			case 'STRONG':
			case 'B':
				out += wrapMark(inlineToMarkdown(element), '**');
				break;
			case 'EM':
			case 'I':
				out += wrapMark(inlineToMarkdown(element), '_');
				break;
			case 'S':
			case 'STRIKE':
			case 'DEL':
				out += wrapMark(inlineToMarkdown(element), '~~');
				break;
			case 'CODE':
				out += `\`${(element.textContent ?? '').replace(ZWSP, '')}\``;
				break;
			case 'A':
				out += `[${inlineToMarkdown(element)}](${element.getAttribute('href') ?? ''})`;
				break;
			case 'UL':
			case 'OL':
				break;
			default:
				out += inlineToMarkdown(element);
		}
	});
	return out;
}

export function listToMarkdown(list: Element, indent: string): string {
	let number = 1;
	return Array.from(list.children)
		.filter((item) => item.nodeName === 'LI')
		.map((item) => {
			const marker = list.nodeName === 'OL' ? `${number++}. ` : '- ';
			const nested = Array.from(item.children)
				.filter((child) => child.nodeName === 'UL' || child.nodeName === 'OL')
				.map((child) => listToMarkdown(child, indent + ' '.repeat(marker.length)));
			return [`${indent}${marker}${inlineToMarkdown(item).trim()}`, ...nested].join('\n');
		})
		.join('\n');
}

export function blockToMarkdown(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) return (node as Text).data.replace(ZWSP, '').trim();
	if (node.nodeType !== Node.ELEMENT_NODE) return '';
	const element = node as HTMLElement;
	switch (element.nodeName) {
		case 'H1':
			return `# ${inlineToMarkdown(element).trim()}`;
		case 'H2':
			return `## ${inlineToMarkdown(element).trim()}`;
		case 'H3':
			return `### ${inlineToMarkdown(element).trim()}`;
		case 'HR':
			return '---';
		case 'PRE':
			return `\`\`\`\n${(element.textContent ?? '').replace(ZWSP, '').replace(/\n$/, '')}\n\`\`\``;
		case 'UL':
		case 'OL':
			return listToMarkdown(element, '');
		case 'BLOCKQUOTE': {
			const blocks = Array.from(element.children).some((child) => BLOCK_TAGS.has(child.nodeName));
			const body = blocks
				? Array.from(element.childNodes).map(blockToMarkdown).filter(Boolean).join('\n\n')
				: inlineToMarkdown(element).trim();
			return body
				.split('\n')
				.map((line) => (line ? `> ${line}` : '>'))
				.join('\n');
		}
		default:
			return inlineToMarkdown(element).trim();
	}
}

/** Converts editor HTML (or an element) to Markdown. */
export function htmlToMarkdown(input: string | HTMLElement) {
	const root = typeof input === 'string' ? parseHtml(input) : input;
	return Array.from(root.childNodes).map(blockToMarkdown).filter(Boolean).join('\n\n');
}

export function parseHtml(html: string) {
	const template = document.createElement('template');
	template.innerHTML = html;
	const root = document.createElement('div');
	root.appendChild(template.content);
	return root;
}

export const insertAfter = (reference: Node, ...nodes: Node[]) => {
	let at = reference;
	nodes.forEach((node) => {
		at.parentNode!.insertBefore(node, at.nextSibling);
		at = node;
	});
};
export const insertBefore = (reference: Node, ...nodes: Node[]) =>
	nodes.forEach((node) => reference.parentNode!.insertBefore(node, reference));
export const replaceNode = (old: Node, ...nodes: Node[]) => {
	insertBefore(old, ...nodes);
	old.parentNode!.removeChild(old);
};
export const appendNodes = (parent: Node, ...nodes: Node[]) =>
	nodes.forEach((node) => parent.appendChild(node));

export const INLINE_MAP: Record<string, string> = {
	B: 'strong',
	STRONG: 'strong',
	I: 'em',
	EM: 'em',
	S: 's',
	STRIKE: 's',
	DEL: 's',
	CODE: 'code',
	A: 'a',
	BR: 'br'
};
export const BLOCK_MAP: Record<string, string> = {
	P: 'p',
	H1: 'h1',
	H2: 'h2',
	H3: 'h3',
	H4: 'h3',
	H5: 'h3',
	H6: 'h3',
	UL: 'ul',
	OL: 'ol',
	LI: 'li',
	BLOCKQUOTE: 'blockquote',
	PRE: 'pre',
	HR: 'hr'
};
export const DROP = new Set([
	'SCRIPT',
	'STYLE',
	'META',
	'LINK',
	'TITLE',
	'TEMPLATE',
	'IFRAME',
	'OBJECT',
	'EMBED',
	'SVG',
	'CANVAS',
	'IMG',
	'VIDEO',
	'AUDIO',
	'INPUT',
	'BUTTON',
	'SELECT',
	'TEXTAREA',
	'HEAD'
]);
export const BLOCK_TAGS = new Set([
	'P',
	'H1',
	'H2',
	'H3',
	'LI',
	'PRE',
	'BLOCKQUOTE',
	'DIV',
	'UL',
	'OL',
	'HR'
]);

/** Keeps only the tags the editor understands and drops every attribute except safe link targets. Bold and italic spans from other editors become marks. */
export function sanitizeHtml(html: string) {
	const source = new DOMParser().parseFromString(html, 'text/html').body;
	const out = document.createElement('div');
	const convert = (from: Node, into: Node) => {
		from.childNodes.forEach((child) => {
			if (child.nodeType === Node.TEXT_NODE) {
				into.appendChild(document.createTextNode((child as Text).data));
				return;
			}
			if (child.nodeType !== Node.ELEMENT_NODE) return;
			const element = child as HTMLElement;
			if (DROP.has(element.nodeName)) return;
			const style = element.getAttribute('style') ?? '';
			let tag = INLINE_MAP[element.nodeName] ?? BLOCK_MAP[element.nodeName];
			if (element.nodeName === 'B' && /font-weight:\s*(normal|[1-4]00)/.test(style)) tag = '';
			if (element.nodeName === 'SPAN')
				tag = /font-weight:\s*(bold|[6-9]00)/.test(style)
					? 'strong'
					: /font-style:\s*italic/.test(style)
						? 'em'
						: /line-through/.test(style)
							? 's'
							: '';
			if (!tag) {
				convert(element, into);
				return;
			}
			const next = document.createElement(tag);
			if (tag === 'a') {
				const href = element.getAttribute('href') ?? '';
				if (!safeUrl(href)) {
					convert(element, into);
					return;
				}
				next.setAttribute('href', href);
			}
			if (tag === 'pre') next.textContent = element.textContent ?? '';
			else if (tag !== 'br' && tag !== 'hr') convert(element, next);
			into.appendChild(next);
		});
	};
	convert(source, out);
	// Inline runs at the top level become paragraphs; whitespace between blocks disappears.
	const fixed = document.createElement('div');
	let run: HTMLElement | null = null;
	Array.from(out.childNodes).forEach((node) => {
		const block = node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.nodeName);
		if (block) {
			run = null;
			fixed.appendChild(node);
			return;
		}
		if (node.nodeType === Node.TEXT_NODE && !(node as Text).data.trim() && !run) return;
		if (!run) {
			run = document.createElement('p');
			fixed.appendChild(run);
		}
		run.appendChild(node);
	});
	fixed
		.querySelectorAll('li > p')
		.forEach((paragraph) => replaceNode(paragraph, ...Array.from(paragraph.childNodes)));
	// The editor keeps typed whitespace, so formatting whitespace between blocks and list items has to go.
	[fixed, ...Array.from(fixed.querySelectorAll('ul, ol, blockquote, li'))].forEach((parent) =>
		Array.from(parent.childNodes).forEach((node) => {
			if (
				isText(node) &&
				!node.data.trim() &&
				(parent === fixed ||
					parent.nodeName === 'UL' ||
					parent.nodeName === 'OL' ||
					(node.previousSibling && BLOCK_TAGS.has(node.previousSibling.nodeName)) ||
					(node.nextSibling && BLOCK_TAGS.has(node.nextSibling.nodeName)))
			)
				node.remove();
		})
	);
	return fixed.innerHTML;
}

/* ------------------------------------------------------------------------------------------------
 * DOM helpers. Positions are stored as character offsets where every block start and line break
 * counts as one character, so the caret survives any rewrite that keeps the text.
 * ---------------------------------------------------------------------------------------------- */

export const COUNTED = new Set(['P', 'H1', 'H2', 'H3', 'LI', 'PRE', 'BLOCKQUOTE', 'DIV']);
export const isElement = (node: Node | null): node is HTMLElement =>
	!!node && node.nodeType === Node.ELEMENT_NODE;
export const isText = (node: Node | null): node is Text =>
	!!node && node.nodeType === Node.TEXT_NODE;

export function pointToOffset(root: Node, container: Node, offset: number) {
	let count = 0,
		found = -1;
	const visit = (node: Node) => {
		if (found >= 0) return;
		if (isText(node)) {
			if (node === container) found = count + offset;
			else count += node.data.length;
			return;
		}
		if (!isElement(node)) return;
		if (node !== root && COUNTED.has(node.nodeName)) count += 1;
		if (node.nodeName === 'BR' || node.nodeName === 'HR') count += 1;
		const children = node.childNodes;
		for (let index = 0; index < children.length; index++) {
			if (node === container && index === offset) {
				found = count;
				return;
			}
			visit(children[index]!);
			if (found >= 0) return;
		}
		if (node === container) found = count;
	};
	visit(root);
	return found < 0 ? count : found;
}

export function offsetToPoint(root: Node, target: number): [Node, number] {
	let count = 0;
	let result: [Node, number] | null = null;
	const visit = (node: Node) => {
		if (result) return;
		if (isText(node)) {
			if (target <= count + node.data.length) {
				result = [node, Math.max(0, target - count)];
				return;
			}
			count += node.data.length;
			return;
		}
		if (!isElement(node)) return;
		if (node !== root && COUNTED.has(node.nodeName)) count += 1;
		if (node.nodeName === 'BR' || node.nodeName === 'HR') {
			if (count === target && node.parentNode) {
				result = [node.parentNode, Array.prototype.indexOf.call(node.parentNode.childNodes, node)];
				return;
			}
			count += 1;
			return;
		}
		node.childNodes.forEach(visit);
		if (!result && count === target && node !== root && COUNTED.has(node.nodeName))
			result = [node, node.childNodes.length];
	};
	visit(root);
	if (result) return result;
	const last = root.lastChild;
	return last && isElement(last) && last.nodeName !== 'HR'
		? [last, last.childNodes.length]
		: [root, root.childNodes.length];
}

export type Offsets = { start: number; end: number };

export function readOffsets(root: HTMLElement): Offsets | null {
	const selection = window.getSelection();
	if (!selection?.rangeCount) return null;
	const range = selection.getRangeAt(0);
	if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
	return {
		start: pointToOffset(root, range.startContainer, range.startOffset),
		end: pointToOffset(root, range.endContainer, range.endOffset)
	};
}

export function writeOffsets(root: HTMLElement, offsets: Offsets | null) {
	const selection = window.getSelection();
	if (!selection) return;
	const range = document.createRange();
	if (!offsets) {
		range.selectNodeContents(root.lastElementChild ?? root);
		range.collapse(false);
	} else {
		const [startNode, startOffset] = offsetToPoint(root, offsets.start);
		const [endNode, endOffset] =
			offsets.end === offsets.start ? [startNode, startOffset] : offsetToPoint(root, offsets.end);
		range.setStart(startNode, startOffset);
		range.setEnd(endNode, endOffset);
	}
	selection.removeAllRanges();
	selection.addRange(range);
}

/** The visible band of the nearest scrolling or clipping ancestor, so floating layers flip before they get cut off. */
export function clipBand(element: HTMLElement) {
	let top = 0,
		bottom = window.innerHeight;
	for (let node = element.parentElement; node; node = node.parentElement) {
		const style = getComputedStyle(node);
		if (style.overflowY !== 'visible' || style.overflowX !== 'visible') {
			const rect = node.getBoundingClientRect();
			top = Math.max(top, rect.top);
			bottom = Math.min(bottom, rect.bottom);
		}
	}
	return { top, bottom };
}

export function placeCaret(node: Node, offset: number) {
	const selection = window.getSelection();
	if (!selection) return;
	const range = document.createRange();
	range.setStart(node, offset);
	range.collapse(true);
	selection.removeAllRanges();
	selection.addRange(range);
}

export function placeAtStart(element: HTMLElement) {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	const first = walker.nextNode();
	if (first) placeCaret(first, 0);
	else placeCaret(element, 0);
}

/** The nearest block around a node: a paragraph, heading, list item, quote, or code block. */
export function blockAt(root: HTMLElement, node: Node | null): HTMLElement | null {
	let current: Node | null = node;
	while (current && current !== root) {
		if (isElement(current) && COUNTED.has(current.nodeName)) return current;
		current = current.parentNode;
	}
	return null;
}

export const visibleText = (element: Node) => (element.textContent ?? '').replace(ZWSP, '');

export function ensureFilled(element: HTMLElement) {
	if (element.nodeName === 'HR') return;
	if (!visibleText(element) && !element.querySelector('br, hr, ul, ol'))
		element.appendChild(document.createElement('br'));
}

export function textBefore(block: HTMLElement, range: Range) {
	const before = document.createRange();
	before.setStart(block, 0);
	before.setEnd(range.startContainer, range.startOffset);
	return before
		.toString()
		.replace(ZWSP, '')
		.replace(/\u00a0/g, ' ');
}

export function atBlockStart(block: HTMLElement, range: Range) {
	if (!range.collapsed) return false;
	const before = document.createRange();
	before.setStart(block, 0);
	before.setEnd(range.startContainer, range.startOffset);
	return !before.toString().replace(ZWSP, '') && !before.cloneContents().querySelector('br, hr');
}

export function moveChildren(from: Node, to: Node) {
	while (from.firstChild) to.appendChild(from.firstChild);
}

/** Plain text of a block, with line breaks for `<br>`, for moving content into a code block. */
export function plainText(element: HTMLElement) {
	let out = '';
	const walk = (node: Node) =>
		node.childNodes.forEach((child) => {
			if (isText(child)) out += child.data.replace(ZWSP, '');
			else if (child.nodeName === 'BR') out += '\n';
			else walk(child);
		});
	walk(element);
	return out.replace(/\n$/, '');
}

export function linesToNodes(text: string) {
	const nodes: Node[] = [];
	text
		.replace(/\n$/, '')
		.split('\n')
		.forEach((line, index) => {
			if (index) nodes.push(document.createElement('br'));
			if (line) nodes.push(document.createTextNode(line));
		});
	return nodes;
}

export function mergeAdjacentLists(list: HTMLElement) {
	const next = list.nextElementSibling;
	if (next && next.nodeName === list.nodeName) {
		moveChildren(next, list);
		next.remove();
	}
	const previous = list.previousElementSibling;
	if (previous && previous.nodeName === list.nodeName) {
		moveChildren(list, previous);
		list.remove();
		return previous as HTMLElement;
	}
	return list;
}

/** Moves a list item one level out. A top level item leaves the list and becomes a paragraph between its halves. */
export function outdent(item: HTMLElement): HTMLElement {
	const list = item.parentElement!;
	const parentItem = list.parentElement;
	const following: Node[] = [];
	for (let node = item.nextSibling; node; node = node.nextSibling) following.push(node);
	if (parentItem?.nodeName === 'LI') {
		if (following.length) {
			const sub = document.createElement(list.nodeName.toLowerCase());
			following.forEach((node) => sub.appendChild(node));
			item.appendChild(sub);
		}
		insertAfter(parentItem, item);
		if (!list.children.length) list.remove();
		return item;
	}
	const paragraph = document.createElement('p');
	const nested: Node[] = [];
	Array.from(item.childNodes).forEach((child) => {
		if (child.nodeName === 'UL' || child.nodeName === 'OL') nested.push(child);
		else paragraph.appendChild(child);
	});
	ensureFilled(paragraph);
	const tail =
		following.length || nested.length ? document.createElement(list.nodeName.toLowerCase()) : null;
	if (tail) {
		nested.forEach(
			(sub) =>
				sub.childNodes.length &&
				Array.from(sub.childNodes).forEach((node) => tail.appendChild(node))
		);
		following.forEach((node) => tail.appendChild(node));
	}
	insertAfter(list, paragraph);
	if (tail) insertAfter(paragraph, tail);
	item.remove();
	if (!list.children.length) list.remove();
	return paragraph;
}

export function indent(item: HTMLElement) {
	const previous = item.previousElementSibling as HTMLElement | null;
	if (!previous || previous.nodeName !== 'LI') return false;
	const listTag = item.parentElement!.nodeName;
	let sub = previous.lastElementChild as HTMLElement | null;
	if (!sub || (sub.nodeName !== 'UL' && sub.nodeName !== 'OL')) {
		sub = document.createElement(listTag.toLowerCase());
		previous.appendChild(sub);
	}
	sub.appendChild(item);
	return true;
}

/** Turns one block into another type, keeping its content. Choosing the type a block already has turns it back into a paragraph. */
export function convertBlock(block: HTMLElement, type: Exclude<BlockType, 'hr'>): HTMLElement {
	if (block.nodeName === 'LI') {
		const list = block.parentElement!;
		if (type === 'ul' || type === 'ol') {
			if (list.nodeName.toLowerCase() === type) return outdent(block);
			const swapped = document.createElement(type);
			moveChildren(list, swapped);
			replaceNode(list, swapped);
			return block;
		}
		const paragraph = outdent(block);
		return paragraph.nodeName === 'P' && type !== 'p' ? convertBlock(paragraph, type) : paragraph;
	}
	if (type === 'ul' || type === 'ol') {
		const item = document.createElement('li');
		if (block.nodeName === 'PRE') appendNodes(item, ...linesToNodes(block.textContent ?? ''));
		else moveChildren(block, item);
		ensureFilled(item);
		const list = document.createElement(type);
		list.appendChild(item);
		replaceNode(block, list);
		mergeAdjacentLists(list);
		return item;
	}
	const tag = block.nodeName.toLowerCase() === type ? 'p' : type;
	const next = document.createElement(tag);
	if (tag === 'pre') next.textContent = plainText(block);
	else if (block.nodeName === 'PRE') appendNodes(next, ...linesToNodes(block.textContent ?? ''));
	else moveChildren(block, next);
	ensureFilled(next);
	replaceNode(block, next);
	return next;
}

/** Makes sure a paragraph follows a block the caret cannot type after, such as a rule or a code block at the end. */
export function paragraphAfter(block: Element) {
	const next = block.nextElementSibling;
	if (next && next.nodeName === 'P') return next as HTMLElement;
	const paragraph = document.createElement('p');
	paragraph.appendChild(document.createElement('br'));
	insertAfter(block, paragraph);
	return paragraph;
}

/** Repairs what browsers leave behind: styled spans from merges, stray inline content at the top level, and an empty root. */
export function tidy(root: HTMLElement) {
	const loose = Array.from(root.childNodes).some(
		(node) =>
			(isText(node) && node.data.trim()) || (isElement(node) && !BLOCK_TAGS.has(node.nodeName))
	);
	const dirty =
		loose || !root.firstChild || root.querySelector('span, font, [style], div, b, i, strike');
	if (!dirty) return;
	const offsets = readOffsets(root);
	root.querySelectorAll('[style]').forEach((element) => {
		const style = element.getAttribute('style') ?? '';
		if (element.nodeName === 'SPAN' && /font-weight:\s*(bold|[6-9]00)/.test(style))
			replaceNode(
				element,
				Object.assign(document.createElement('strong'), { innerHTML: element.innerHTML })
			);
		else element.removeAttribute('style');
	});
	const rename = (selector: string, tag: string) =>
		root.querySelectorAll(selector).forEach((element) => {
			const next = document.createElement(tag);
			moveChildren(element, next);
			replaceNode(element, next);
		});
	rename('b', 'strong');
	rename('i', 'em');
	rename('strike', 's');
	rename(':scope > div', 'p');
	root
		.querySelectorAll('span, font, div')
		.forEach((element) => replaceNode(element, ...Array.from(element.childNodes)));
	let run: HTMLElement | null = null;
	Array.from(root.childNodes).forEach((node) => {
		if (isElement(node) && BLOCK_TAGS.has(node.nodeName)) {
			run = null;
			return;
		}
		if (isText(node) && !node.data.trim() && !run) {
			node.remove();
			return;
		}
		if (!run) {
			run = document.createElement('p');
			insertBefore(node, run);
		}
		run.appendChild(node);
	});
	if (!root.firstChild) root.innerHTML = '<p><br></p>';
	if (root.contains(document.activeElement) || document.activeElement === root)
		writeOffsets(root, offsets);
}

/** A clean copy for output: canonical tags, no attributes but links, no invisible helpers, no trailing empty lines. */
export function cleanClone(root: HTMLElement) {
	const clone = root.cloneNode(true) as HTMLElement;
	clone.querySelectorAll('*').forEach((element) => {
		Array.from(element.attributes).forEach((attribute) => {
			if (!(element.nodeName === 'A' && attribute.name === 'href'))
				element.removeAttribute(attribute.name);
		});
	});
	const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
	const empty: Text[] = [];
	for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
		node.data = node.data.replace(ZWSP, '');
		if (!node.data) empty.push(node);
	}
	empty.forEach((node) => node.remove());
	clone.querySelectorAll('p, h1, h2, h3, li, blockquote').forEach((block) => {
		const last = block.lastChild;
		if (last?.nodeName === 'BR' && visibleText(block)) last.remove();
	});
	clone.querySelectorAll('pre').forEach((pre) => {
		pre.textContent = (pre.textContent ?? '').replace(/\n$/, '');
	});
	while (
		clone.lastElementChild &&
		clone.lastElementChild.nodeName !== 'HR' &&
		!visibleText(clone.lastElementChild) &&
		clone.children.length > 1
	)
		clone.lastElementChild.remove();
	return clone;
}

export function plainOutput(clone: HTMLElement) {
	return Array.from(clone.querySelectorAll('p, h1, h2, h3, li, blockquote, pre'))
		.filter((block) => !block.querySelector('p, li'))
		.map((block) => (block.textContent ?? '').trim())
		.filter(Boolean)
		.join('\n');
}
