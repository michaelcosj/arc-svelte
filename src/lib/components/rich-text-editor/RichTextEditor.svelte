<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Command, Toolbar } from 'bits-ui';
	import ToolButton from './ToolButton.svelte';
	import {
		motionTokens as m,
		swap,
		springCurve,
		TargetSpring,
		easeOut,
		type SwapParams
	} from '#lib/motion';
	import type { RichTextEditorProps, RichTextEditorHandle } from './types';
	import {
		ZWSP,
		normalizeUrl,
		markdownToHtml,
		htmlToMarkdown,
		parseHtml,
		insertAfter,
		replaceNode,
		sanitizeHtml,
		isElement,
		isText,
		type Offsets,
		readOffsets,
		writeOffsets,
		clipBand,
		placeCaret,
		placeAtStart,
		blockAt,
		visibleText,
		ensureFilled,
		textBefore,
		atBlockStart,
		outdent,
		indent,
		convertBlock,
		paragraphAfter,
		tidy,
		cleanClone,
		plainOutput
	} from './editor-dom';
	import type { BlockType } from './editor-dom';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Bold from '@lucide/svelte/icons/bold';
	import Check from '@lucide/svelte/icons/check';
	import Code from '@lucide/svelte/icons/code';
	import Heading1 from '@lucide/svelte/icons/heading-1';
	import Heading2 from '@lucide/svelte/icons/heading-2';
	import Heading3 from '@lucide/svelte/icons/heading-3';
	import Italic from '@lucide/svelte/icons/italic';
	import Link from '@lucide/svelte/icons/link';
	import List from '@lucide/svelte/icons/list';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import Minus from '@lucide/svelte/icons/minus';
	import Pilcrow from '@lucide/svelte/icons/pilcrow';
	import Quote from '@lucide/svelte/icons/quote';
	import SquareCode from '@lucide/svelte/icons/square-code';
	import Strikethrough from '@lucide/svelte/icons/strikethrough';
	import Unlink from '@lucide/svelte/icons/unlink';
	import './rich-text-editor.css';
	let {
		value = $bindable(),
		defaultValue,
		defaultMarkdown,
		onChange,
		onHistoryChange,
		placeholder = 'Start writing',
		blockHint = 'Type / for blocks',
		readOnly = false,
		autoFocus = false,
		'aria-label': ariaLabel = 'Editor',
		class: className,
		style,
		ref = $bindable(null)
	}: RichTextEditorProps = $props();
	const uid = $props.id();
	const reduced = $derived(prefersReducedMotion.current);
	let rootRef = $state<HTMLDivElement>();
	let editorRef = $state<HTMLDivElement>();
	let linkInputRef = $state<HTMLInputElement>();
	let busy = false,
		dragging = false,
		lastInput = '',
		lastEmitted: string | null = null;
	let history: { stack: Snapshot[]; index: number } = { stack: [], index: -1 };
	let savedRange: Range | null = null,
		hinted: HTMLElement | null = null;
	let empty = $state(true);
	let formats = $state<Formats>({
		bold: false,
		italic: false,
		strike: false,
		code: false,
		link: null,
		block: 'p'
	});
	let bar = $state<{ x: number; y: number; below: boolean } | null>(null);
	let face = $state<'format' | 'link'>('format');
	let linkDraft = $state('');
	let slash = $state<Slash | null>(null);
	let slashActive = $state(0);
	let announce = $state('');
	type Formats = {
		bold: boolean;
		italic: boolean;
		strike: boolean;
		code: boolean;
		link: string | null;
		block: string;
	};
	type Slash = {
		node: Text;
		offset: number;
		query: string;
		x: number;
		y: number;
		above: boolean;
		max: number;
	};
	type Snapshot = { html: string; selection: Offsets | null; kind: 'type' | 'command'; at: number };
	const SLASH_ITEMS = [
		{ type: 'p', label: 'Text', hint: '', keywords: 'paragraph plain body', icon: Pilcrow },
		{ type: 'h1', label: 'Heading 1', hint: '#', keywords: 'title h1 large', icon: Heading1 },
		{ type: 'h2', label: 'Heading 2', hint: '##', keywords: 'subtitle h2 section', icon: Heading2 },
		{ type: 'h3', label: 'Heading 3', hint: '###', keywords: 'h3 small', icon: Heading3 },
		{
			type: 'ul',
			label: 'Bulleted list',
			hint: '-',
			keywords: 'bullet unordered ul points',
			icon: List
		},
		{
			type: 'ol',
			label: 'Numbered list',
			hint: '1.',
			keywords: 'ordered ol steps numbers',
			icon: ListOrdered
		},
		{
			type: 'blockquote',
			label: 'Quote',
			hint: '>',
			keywords: 'blockquote citation callout',
			icon: Quote
		},
		{
			type: 'pre',
			label: 'Code block',
			hint: '```',
			keywords: 'pre snippet monospace',
			icon: SquareCode
		},
		{ type: 'hr', label: 'Divider', hint: '---', keywords: 'rule hr line separator', icon: Minus }
	] as const;
	type SlashItem = (typeof SLASH_ITEMS)[number];
	const slashResults = $derived.by(() => {
		const query = slash?.query.trim().toLowerCase() ?? '';
		return !query
			? SLASH_ITEMS
			: SLASH_ITEMS.filter(
					(item) =>
						(item.label + ' ' + item.keywords)
							.toLowerCase()
							.split(/\s+/)
							.some((word) => word.startsWith(query)) || item.label.toLowerCase().includes(query)
				);
	});
	const slashIndex = $derived(Math.min(slashActive, Math.max(0, slashResults.length - 1)));
	const slashOpen = $derived(!!slash && slashResults.length > 0);
	/* Output and history. */
	const emit = () => {
		const editor = editorRef;
		if (!editor) return;
		const clone = cleanClone(editor);
		const html = clone.innerHTML;
		const text = plainOutput(clone);
		const isEmpty = !text && !clone.querySelector('hr');
		lastEmitted = html;
		empty = isEmpty;
		if (!onChange) value = html;
		onChange?.({ html, markdown: htmlToMarkdown(clone), text, empty: isEmpty });
	};

	const reportHistory = () => {
		const { stack, index } = history;
		onHistoryChange?.({ canUndo: index > 0, canRedo: index < stack.length - 1 });
	};

	const record = (kind: Snapshot['kind'], boundary = false) => {
		const editor = editorRef;
		if (!editor) return;
		const snap: Snapshot = {
			html: editor.innerHTML.replace(/ data-hint=""/g, ''),
			selection: readOffsets(editor),
			kind,
			at: Date.now()
		};
		const state = history;
		const top = state.stack[state.index];
		if (top && top.html === snap.html) {
			top.selection = snap.selection;
			return;
		}
		if (
			kind === 'type' &&
			top?.kind === 'type' &&
			state.index > 0 &&
			snap.at - top.at < 1000 &&
			!boundary
		) {
			state.stack[state.index] = { ...snap, at: top.at };
		} else {
			state.stack = state.stack.slice(0, state.index + 1);
			state.stack.push(snap);
			if (state.stack.length > 300) state.stack.shift();
			state.index = state.stack.length - 1;
		}
		reportHistory();
	};

	const restore = (snap: Snapshot) => {
		const editor = editorRef;
		if (!editor) return;
		editor.innerHTML = snap.html;
		hinted = null;
		editor.focus({ preventScroll: true });
		writeOffsets(editor, snap.selection);
		emit();
		reportHistory();
	};

	const undo = () => {
		const state = history;
		if (state.index <= 0) return;
		state.index -= 1;
		slash = null;
		restore(state.stack[state.index]!);
		announce = 'Undone';
	};
	const redo = () => {
		const state = history;
		if (state.index >= state.stack.length - 1) return;
		state.index += 1;
		slash = null;
		restore(state.stack[state.index]!);
		announce = 'Redone';
	};

	/* Selection driven chrome: block hint, active formats, the slash query, and the toolbar. */
	const sync = () => {
		const editor = editorRef,
			root = rootRef;
		if (!editor || !root || busy) return;
		const selection = window.getSelection();
		const inside = !!selection?.rangeCount && editor.contains(selection.anchorNode);
		const range = inside ? selection!.getRangeAt(0) : null;

		const block = range ? blockAt(editor, range.startContainer) : null;
		const hint =
			range?.collapsed && block && !visibleText(block) && block.nodeName !== 'PRE' ? block : null;
		if (hinted !== hint) {
			hinted?.removeAttribute('data-hint');
			hint?.setAttribute('data-hint', '');
			hinted = hint;
		}

		if (!range) {
			if (face !== 'link') bar = null;
			slash = null;
			return;
		}

		const start = isElement(range.startContainer)
			? range.startContainer
			: range.startContainer.parentElement;
		const within = (selector: string) => {
			const found = start?.closest(selector);
			return !!found && editor.contains(found);
		};
		const anchor = start?.closest('a');
		const listItem =
			block?.nodeName === 'LI' ? (block.parentElement?.nodeName.toLowerCase() ?? 'ul') : null;
		const next: Formats = {
			bold: within('strong, b'),
			italic: within('em, i'),
			strike: within('s, strike, del'),
			code: within('code') && !within('pre'),
			link: anchor && editor.contains(anchor) ? anchor.getAttribute('href') : null,
			block: listItem ?? block?.nodeName.toLowerCase() ?? 'p'
		};
		formats = next;

		const open = slash;
		if (open) {
			const valid =
				range.collapsed &&
				range.startContainer === open.node &&
				range.startOffset > open.offset &&
				open.node.data[open.offset] === '/';
			const query = valid ? open.node.data.slice(open.offset + 1, range.startOffset) : '';
			if (!valid || query.length > 24 || /^\s/.test(query) || /\s\s/.test(query)) slash = null;
			else if (query !== open.query) slash = { ...open, query };
		}

		const inCode = !!start?.closest('pre');
		if (range.collapsed || dragging || inCode || slash || readOnly) {
			if (face !== 'link') bar = null;
			return;
		}
		const rects = range.getClientRects();
		const rect = rects.length ? rects[0]! : range.getBoundingClientRect();
		const whole = range.getBoundingClientRect();
		const box = root.getBoundingClientRect();
		const below = rect.top - clipBand(root).top < 60;
		bar = {
			x: whole.left + whole.width / 2 - box.left,
			y: below ? whole.bottom - box.top + 8 : rect.top - box.top - 8,
			below
		};
	};

	const run = (change: () => void) => {
		const editor = editorRef;
		if (!editor) return;
		busy = true;
		try {
			change();
			tidy(editor);
		} finally {
			busy = false;
		}
		record('command');
		emit();
		sync();
	};

	/* Content in and out. */
	const load = (html: string) => {
		const editor = editorRef;
		if (!editor) return;
		editor.innerHTML = sanitizeHtml(html) || '<p><br></p>';
		editor
			.querySelectorAll('p, h1, h2, h3, li, blockquote, pre')
			.forEach((block) => ensureFilled(block as HTMLElement));
		hinted = null;
	};

	/* Markdown shortcuts, applied right after the character that completes them. */
	const shortcut = (data: string | null) => {
		const editor = editorRef;
		const selection = window.getSelection();
		if (!editor || !data || !selection?.rangeCount) return false;
		const range = selection.getRangeAt(0);
		if (!range.collapsed) return false;
		const block = blockAt(editor, range.startContainer);
		if (!block || block.nodeName === 'PRE') return false;
		const before = textBefore(block, range);
		const plainBlock = block.nodeName === 'P' || block.nodeName === 'DIV';

		if (data === ' ' && plainBlock && block.parentElement === editor) {
			const rule: [RegExp, Exclude<BlockType, 'hr'>][] = [
				[/^# $/, 'h1'],
				[/^## $/, 'h2'],
				[/^### $/, 'h3'],
				[/^[-*+] $/, 'ul'],
				[/^\d+[.)] $/, 'ol'],
				[/^> $/, 'blockquote']
			];
			const match = rule.find(([pattern]) => pattern.test(before));
			if (match) {
				const prefix = document.createRange();
				prefix.setStart(block, 0);
				prefix.setEnd(range.startContainer, range.startOffset);
				prefix.deleteContents();
				const next = convertBlock(block, match[1]);
				placeAtStart(next);
				return true;
			}
		}
		if (
			data === '-' &&
			plainBlock &&
			block.parentElement === editor &&
			before === '---' &&
			visibleText(block) === '---'
		) {
			const rule = document.createElement('hr');
			replaceNode(block, rule);
			placeAtStart(paragraphAfter(rule));
			return true;
		}
		if (
			data === '`' &&
			plainBlock &&
			block.parentElement === editor &&
			before === '```' &&
			visibleText(block) === '```'
		) {
			block.textContent = '';
			const next = convertBlock(block, 'pre');
			placeAtStart(next);
			return true;
		}
		const node = range.startContainer;
		if (!isText(node) || node.parentElement?.closest('code')) return false;
		const text = node.data.slice(0, range.startOffset);
		const inline: [RegExp, string][] = [
			[/(\*\*|__)([^*_\s](?:[^*_]*[^*_\s])?)\1$/, 'strong'],
			[/~~([^~\s](?:[^~]*[^~\s])?)~~$/, 's'],
			[/`([^`]+)`$/, 'code'],
			[/(?:^|[^*\w])(\*([^*\s](?:[^*]*[^*\s])?)\*)$/, 'em'],
			[/(?:^|[^_\w])(_([^_\s](?:[^_]*[^_\s])?)_)$/, 'em']
		];
		for (const [pattern, tag] of inline) {
			const match = pattern.exec(text);
			if (!match) continue;
			const whole = tag === 'em' ? match[1]! : match[0];
			const inner =
				tag === 'em' ? match[2]! : tag === 'code' ? match[1]! : tag === 's' ? match[1]! : match[2]!;
			const from = range.startOffset - whole.length;
			node.splitText(range.startOffset);
			const middle = node.splitText(from);
			const element = document.createElement(tag);
			element.textContent = inner;
			replaceNode(middle, element);
			// A zero width space after the mark keeps the next keystroke outside it; output strips it.
			const exit = document.createTextNode('\u200b');
			insertAfter(element, exit);
			placeCaret(exit, 1);
			return true;
		}
		return false;
	};

	const openSlashIfTyped = (data: string | null) => {
		const editor = editorRef,
			root = rootRef;
		const selection = window.getSelection();
		if (data !== '/' || !editor || !root || !selection?.rangeCount) return;
		const range = selection.getRangeAt(0);
		const node = range.startContainer;
		if (!range.collapsed || !isText(node) || node.parentElement?.closest('pre, code')) return;
		const offset = range.startOffset - 1;
		if (
			node.data[offset] !== '/' ||
			(offset > 0 && !/[\s\u00a0\u200b]/.test(node.data[offset - 1]!))
		)
			return;
		const mark = document.createRange();
		mark.setStart(node, offset);
		mark.setEnd(node, offset + 1);
		const rect = mark.getBoundingClientRect(),
			box = root.getBoundingClientRect();
		const band = clipBand(root);
		const above =
			band.bottom - rect.bottom < 330 && rect.top - band.top > band.bottom - rect.bottom;
		const room = above ? rect.top - band.top - 12 : band.bottom - rect.bottom - 12;
		slash = {
			node,
			offset,
			query: '',
			x: Math.max(0, Math.min(rect.left - box.left - 8, box.width - 244)),
			y: above ? rect.top - box.top - 6 : rect.bottom - box.top + 6,
			above,
			max: Math.max(150, room)
		};
		slashActive = 0;
		bar = null;
	};

	const applyBlock = (type: BlockType, target?: HTMLElement | null) => {
		const editor = editorRef;
		const selection = window.getSelection();
		if (!editor || !selection?.rangeCount) return;
		const range = selection.getRangeAt(0);
		const offsets = readOffsets(editor);
		const block = target ?? blockAt(editor, range.startContainer);
		if (!block) return;
		if (type === 'hr') {
			const top = block.nodeName === 'LI' ? block.closest('ul, ol')! : block;
			const rule = document.createElement('hr');
			if (!visibleText(block) && block.nodeName !== 'LI') replaceNode(block, rule);
			else insertAfter(top, rule);
			placeAtStart(paragraphAfter(rule));
			return;
		}
		// Several selected blocks turn together; if every one already has the type, they all turn back into paragraphs.
		const blocks = range.collapsed
			? [block]
			: Array.from(
					editor.querySelectorAll<HTMLElement>('p, h1, h2, h3, li, blockquote, pre')
				).filter(
					(candidate) => range.intersectsNode(candidate) && !candidate.querySelector('p, li')
				);
		const current = (candidate: HTMLElement) =>
			candidate.nodeName === 'LI'
				? candidate.parentElement!.nodeName.toLowerCase()
				: candidate.nodeName.toLowerCase();
		const allSame = blocks.every((candidate) => current(candidate) === type);
		blocks.forEach((candidate) => {
			if (allSame) convertBlock(candidate, type);
			else if (current(candidate) !== type) convertBlock(candidate, type);
		});
		writeOffsets(editor, offsets);
		if (type === 'pre') {
			const pre = blockAt(editor, window.getSelection()?.anchorNode ?? null);
			if (pre && !pre.nextElementSibling) paragraphAfter(pre);
		}
	};

	const chooseSlash = (item: SlashItem | undefined) => {
		const open = slash;
		const editor = editorRef;
		if (!item || !open || !editor) return;
		const selection = window.getSelection();
		const caret =
			selection?.rangeCount && selection.getRangeAt(0).startContainer === open.node
				? selection.getRangeAt(0).startOffset
				: open.offset + 1 + open.query.length;
		slash = null;
		run(() => {
			open.node.deleteData(open.offset, Math.max(1, caret - open.offset));
			const block = blockAt(editor, open.node);
			placeCaret(open.node, open.offset);
			if (block) {
				ensureFilled(block);
				applyBlock(item.type, block);
			}
		});
		announce = `${item.label} added`;
	};

	/* Inline marks and links. */
	const toggleMark = (mark: 'bold' | 'italic' | 'strike' | 'code') =>
		run(() => {
			const editor = editorRef!;
			const selection = window.getSelection();
			if (!selection?.rangeCount) return;
			const range = selection.getRangeAt(0);
			if (mark !== 'code') {
				document.execCommand('styleWithCSS', false, 'false');
				document.execCommand(mark === 'strike' ? 'strikeThrough' : mark);
				return;
			}
			const startElement = isElement(range.startContainer)
				? range.startContainer
				: range.startContainer.parentElement;
			const code = startElement?.closest('code');
			if (code && editor.contains(code) && !code.closest('pre')) {
				const text = document.createTextNode(code.textContent ?? '');
				replaceNode(code, text);
				const next = document.createRange();
				next.selectNodeContents(text);
				selection.removeAllRanges();
				selection.addRange(next);
				return;
			}
			if (
				range.collapsed ||
				blockAt(editor, range.startContainer) !== blockAt(editor, range.endContainer)
			)
				return;
			const element = document.createElement('code');
			element.textContent = range.toString();
			range.deleteContents();
			range.insertNode(element);
			const next = document.createRange();
			next.selectNodeContents(element);
			selection.removeAllRanges();
			selection.addRange(next);
		});

	const openLink = () => {
		const editor = editorRef;
		const selection = window.getSelection();
		if (!editor || !selection?.rangeCount) return;
		let range = selection.getRangeAt(0);
		const startElement = isElement(range.startContainer)
			? range.startContainer
			: range.startContainer.parentElement;
		const existing = startElement?.closest('a');
		if (existing && editor.contains(existing)) {
			range = document.createRange();
			range.selectNodeContents(existing);
			selection.removeAllRanges();
			selection.addRange(range);
		}
		if (range.collapsed) return;
		savedRange = range.cloneRange();
		linkDraft = existing?.getAttribute('href') ?? '';
		face = 'link';
		sync();
		requestAnimationFrame(() => linkInputRef?.focus({ preventScroll: true }));
	};

	const closeLink = (focusEditor = true) => {
		face = 'format';
		const editor = editorRef,
			range = savedRange;
		savedRange = null;
		if (focusEditor && editor && range) {
			editor.focus({ preventScroll: true });
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
		sync();
	};

	const applyLink = (remove = false) => {
		const range = savedRange;
		const editor = editorRef;
		const url = normalizeUrl(linkDraft);
		if (!range || !editor) {
			closeLink();
			return;
		}
		editor.focus({ preventScroll: true });
		const selection = window.getSelection()!;
		selection.removeAllRanges();
		selection.addRange(range);
		run(() => {
			const startElement = isElement(range.startContainer)
				? range.startContainer
				: range.startContainer.parentElement;
			const existing = startElement?.closest('a');
			if (remove || !url) {
				if (existing && editor.contains(existing))
					replaceNode(existing, ...Array.from(existing.childNodes));
				else document.execCommand('unlink');
				return;
			}
			if (existing && editor.contains(existing) && range.toString() === existing.textContent) {
				existing.setAttribute('href', url);
				return;
			}
			if (blockAt(editor, range.startContainer) !== blockAt(editor, range.endContainer)) {
				document.execCommand('createLink', false, url);
				return;
			}
			const contents = range.extractContents();
			contents
				.querySelectorAll('a')
				.forEach((anchor) => replaceNode(anchor, ...Array.from(anchor.childNodes)));
			const anchor = document.createElement('a');
			anchor.setAttribute('href', url);
			anchor.appendChild(contents);
			range.insertNode(anchor);
			const after = document.createRange();
			after.setStartAfter(anchor);
			after.collapse(true);
			selection.removeAllRanges();
			selection.addRange(after);
		});
		savedRange = null;
		face = 'format';
		bar = null;
		announce = remove || !url ? 'Link removed' : 'Link added';
	};

	/* Keyboard. Enter, Backspace at a block edge, and history go through beforeinput so mobile keyboards behave the same. */
	const enterKey = (soft: boolean) => {
		const editor = editorRef!;
		const selection = window.getSelection();
		if (!selection?.rangeCount) return;
		let range = selection.getRangeAt(0);
		if (!range.collapsed) {
			range.deleteContents();
			range = selection.getRangeAt(0);
		}
		const block = blockAt(editor, range.startContainer);
		if (!block) return;

		if (block.nodeName === 'PRE') {
			const full = block.textContent ?? '';
			const caret = textBefore(block, range).length;
			const head = full.slice(0, caret),
				tail = full.slice(caret);
			if (!tail.replace(/\n$/, '') && head.endsWith('\n') && !soft) {
				block.textContent = head.slice(0, -1) || '';
				ensureFilled(block);
				const paragraph = document.createElement('p');
				paragraph.appendChild(document.createElement('br'));
				insertAfter(block, paragraph);
				placeAtStart(paragraph);
				return;
			}
			block.textContent = head + '\n' + (tail || '\n');
			placeCaret(block.firstChild!, caret + 1);
			return;
		}

		if (soft) {
			const br = document.createElement('br');
			range.insertNode(br);
			if (
				!br.nextSibling ||
				(isText(br.nextSibling) && !br.nextSibling.data && !br.nextSibling.nextSibling)
			)
				insertAfter(br, document.createElement('br'));
			const after = document.createRange();
			after.setStartAfter(br);
			after.collapse(true);
			selection.removeAllRanges();
			selection.addRange(after);
			return;
		}

		if (block.nodeName === 'LI' && !visibleText(block) && !block.querySelector('ul, ol')) {
			placeAtStart(outdent(block));
			return;
		}
		if (block.nodeName === 'BLOCKQUOTE' && !visibleText(block)) {
			placeAtStart(convertBlock(block, 'p'));
			return;
		}

		const tail = document.createRange();
		tail.setStart(range.startContainer, range.startOffset);
		tail.setEnd(block, block.childNodes.length);
		const atEnd =
			!tail.toString().replace(ZWSP, '') && !tail.cloneContents().querySelector('ul, ol');
		const heading = /^H[1-3]$/.test(block.nodeName);
		const fragment = tail.extractContents();
		const next = document.createElement(heading && atEnd ? 'p' : block.nodeName.toLowerCase());
		if (!(heading && atEnd)) next.appendChild(fragment);
		// Formatting open at the caret carries into the new line only when there is text to carry.
		if (heading && atEnd) next.appendChild(document.createElement('br'));
		insertAfter(block, next);
		block.querySelectorAll(':scope > br:last-child').forEach((br) => {
			if (visibleText(block)) br.remove();
		});
		ensureFilled(block);
		ensureFilled(next);
		if (!visibleText(next))
			next.querySelectorAll('strong, em, s, code, a').forEach((element) => {
				if (!visibleText(element)) element.remove();
			});
		ensureFilled(next);
		placeAtStart(next);
	};

	const backspaceAtStart = () => {
		const editor = editorRef!;
		const selection = window.getSelection();
		if (!selection?.rangeCount) return false;
		const range = selection.getRangeAt(0);
		const block = blockAt(editor, range.startContainer);
		if (!block || !atBlockStart(block, range)) return false;
		if (/^(H[1-3]|BLOCKQUOTE|PRE)$/.test(block.nodeName)) {
			placeAtStart(convertBlock(block, 'p'));
			return true;
		}
		if (block.nodeName === 'LI') {
			placeAtStart(outdent(block));
			return true;
		}
		const previous = block.previousElementSibling;
		if (previous?.nodeName === 'HR') {
			previous.remove();
			return true;
		}
		if (!previous && !visibleText(block) && block.nextElementSibling) {
			const next = block.nextElementSibling as HTMLElement;
			block.remove();
			placeAtStart(next);
			return true;
		}
		return false;
	};

	const onBeforeInput = (event: InputEvent) => {
		const editor = editorRef!;
		if (readOnly) return;
		switch (event.inputType) {
			case 'historyUndo':
				event.preventDefault();
				undo();
				return;
			case 'historyRedo':
				event.preventDefault();
				redo();
				return;
			case 'insertParagraph':
			case 'insertLineBreak':
				event.preventDefault();
				if (slash) return;
				run(() => enterKey(event.inputType === 'insertLineBreak'));
				return;
			case 'deleteContentBackward': {
				const selection = window.getSelection();
				if (!selection?.rangeCount || !selection.getRangeAt(0).collapsed) return;
				busy = true;
				let handled = false;
				try {
					handled = backspaceAtStart();
				} finally {
					busy = false;
				}
				if (handled) {
					event.preventDefault();
					tidy(editor);
					record('command');
					emit();
					sync();
				}
				return;
			}
			case 'insertText': {
				// Typing into an emptied editor lands in a paragraph, never loose at the root.
				const selection = window.getSelection();
				if (
					!selection?.rangeCount ||
					blockAt(editor, selection.anchorNode) ||
					editor.querySelector('p, h1, h2, h3, li, pre, blockquote')
				)
					return;
				event.preventDefault();
				const paragraph = document.createElement('p');
				const text = document.createTextNode(event.data ?? '');
				paragraph.appendChild(text);
				editor.replaceChildren(paragraph);
				placeCaret(text, text.length);
				record('type');
				emit();
				sync();
				return;
			}
			case 'insertFromDrop':
				event.preventDefault();
				return;
			case 'formatUnderline':
				event.preventDefault();
				return;
		}
	};
	const onInput = (event: Event) => {
		if (busy) return;
		const editor = editorRef!;
		const native = event as InputEvent;
		if (native.isComposing) return;
		busy = true;
		let converted = false;
		try {
			tidy(editor);
			if (native.inputType === 'insertText') converted = shortcut(native.data);
		} finally {
			busy = false;
		}
		if (converted) {
			tidy(editor);
			record('command');
			announce = 'Formatted';
		} else record('type', native.data === ' ' || native.inputType !== lastInput);
		lastInput = native.inputType;
		emit();
		if (!converted && native.inputType === 'insertText') openSlashIfTyped(native.data);
		sync();
	};

	const focusToolbar = () =>
		Array.from(rootRef?.querySelectorAll<HTMLElement>(`[data-toolbar="${uid}"] button`) ?? [])
			.find((button) => !button.closest('[inert]'))
			?.focus();

	const onKeyDown = (event: KeyboardEvent) => {
		if (readOnly) return;
		const mod = event.metaKey || event.ctrlKey;
		const key = event.key.toLowerCase();
		if (slashOpen) {
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				slashActive =
					(slashIndex + (event.key === 'ArrowDown' ? 1 : -1) + slashResults.length) %
					slashResults.length;
				return;
			}
			if (event.key === 'Enter' || event.key === 'Tab') {
				event.preventDefault();
				chooseSlash(slashResults[slashIndex]);
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				slash = null;
				return;
			}
		}
		if (mod && key === 'z') {
			event.preventDefault();
			if (event.shiftKey) redo();
			else undo();
			return;
		}
		if (mod && key === 'y') {
			event.preventDefault();
			redo();
			return;
		}
		if (mod && !event.shiftKey && key === 'b') {
			event.preventDefault();
			toggleMark('bold');
			return;
		}
		if (mod && !event.shiftKey && key === 'i') {
			event.preventDefault();
			toggleMark('italic');
			return;
		}
		if (mod && event.shiftKey && key === 'x') {
			event.preventDefault();
			toggleMark('strike');
			return;
		}
		if (mod && key === 'e') {
			event.preventDefault();
			toggleMark('code');
			return;
		}
		if (mod && key === 'k') {
			event.preventDefault();
			openLink();
			return;
		}
		if (mod && key === 'u') {
			event.preventDefault();
			return;
		}
		if (event.altKey && event.key === 'F10' && bar) {
			event.preventDefault();
			focusToolbar();
			return;
		}
		if (event.key === 'Tab') {
			const editor = editorRef!;
			const selection = window.getSelection();
			const block = selection?.rangeCount ? blockAt(editor, selection.anchorNode) : null;
			if (block?.nodeName === 'LI') {
				event.preventDefault();
				run(() => {
					const offsets = readOffsets(editor);
					if (event.shiftKey) outdent(block);
					else indent(block);
					writeOffsets(editor, offsets);
				});
			} else if (block?.nodeName === 'PRE' && !event.shiftKey) {
				event.preventDefault();
				run(() => {
					const range = selection!.getRangeAt(0);
					range.deleteContents();
					const spaces = document.createTextNode('  ');
					range.insertNode(spaces);
					placeCaret(spaces, 2);
					block.normalize();
				});
			}
		}
	};

	const onPaste = (event: ClipboardEvent) => {
		if (readOnly) return;
		event.preventDefault();
		const editor = editorRef!;
		const html = event.clipboardData!.getData('text/html');
		const text = event.clipboardData!.getData('text/plain');
		run(() => {
			const selection = window.getSelection();
			if (!selection?.rangeCount) return;
			const range = selection.getRangeAt(0);
			range.deleteContents();
			const block = blockAt(editor, range.startContainer);
			const markdownish =
				/(^|\n)\s*(#{1,3}\s|[-*+]\s|\d+[.)]\s|>|```)|\*\*|`[^`]+`|\[[^\]]+\]\(/.test(text);
			const source = html
				? sanitizeHtml(html)
				: markdownish || text.includes('\n\n')
					? markdownToHtml(text)
					: '';
			const fragment = source ? parseHtml(source) : null;
			const single =
				fragment && fragment.children.length === 1 && fragment.firstElementChild!.nodeName === 'P';
			// Plain text, code blocks, and list items take the text as it is; everything else keeps its structure.
			if (!fragment || !block || block.nodeName === 'PRE' || (block.nodeName === 'LI' && !single)) {
				const plain = block?.nodeName === 'PRE' ? text : text.replace(/\s*\n\s*/g, ' ');
				const node = document.createTextNode(plain);
				range.insertNode(node);
				placeCaret(node, node.length);
				return;
			}
			if (single) {
				const nodes = Array.from(fragment.firstElementChild!.childNodes);
				const last = nodes[nodes.length - 1];
				const holder = document.createDocumentFragment();
				nodes.forEach((node) => holder.appendChild(node));
				range.insertNode(holder);
				if (last) {
					const after = document.createRange();
					after.setStartAfter(last);
					after.collapse(true);
					selection.removeAllRanges();
					selection.addRange(after);
				}
				return;
			}
			const tail = document.createRange();
			tail.setStart(range.startContainer, range.startOffset);
			tail.setEnd(block, block.childNodes.length);
			const rest = document.createElement(
				block.nodeName === 'LI' ? 'p' : block.nodeName.toLowerCase()
			);
			rest.appendChild(tail.extractContents());
			const top = block.nodeName === 'LI' ? block.closest('ul, ol')! : block;
			const blocks = Array.from(fragment.childNodes);
			let anchor: Element = top;
			blocks.forEach((node) => {
				insertAfter(anchor, node);
				if (isElement(node)) anchor = node;
			});
			if (visibleText(rest) || rest.querySelector('br')) {
				insertAfter(anchor, rest);
				ensureFilled(rest);
			}
			if (!visibleText(block) && block.nodeName === 'P') block.remove();
			const end = document.createRange();
			end.selectNodeContents(anchor);
			end.collapse(false);
			selection.removeAllRanges();
			selection.addRange(end);
		});
	};

	const initial = untrack(() => ({ value, defaultValue, defaultMarkdown, autoFocus }));
	let ready = $state(false);
	const handle: RichTextEditorHandle = {
		focus: () => editorRef?.focus(),
		getHTML: () => (editorRef ? cleanClone(editorRef).innerHTML : ''),
		getMarkdown: () => (editorRef ? htmlToMarkdown(cleanClone(editorRef)) : ''),
		getText: () => (editorRef ? plainOutput(cleanClone(editorRef)) : ''),
		setHTML: (html) => {
			load(html);
			record('command');
			emit();
		},
		setMarkdown: (markdown) => {
			load(markdownToHtml(markdown));
			record('command');
			emit();
		},
		clear: () => {
			load('<p><br></p>');
			record('command');
			emit();
		},
		undo,
		redo,
		get element() {
			return editorRef ?? null;
		}
	};
	onMount(() => {
		load(
			initial.value ??
				initial.defaultValue ??
				(initial.defaultMarkdown !== undefined
					? markdownToHtml(initial.defaultMarkdown)
					: '<p><br></p>')
		);
		history = {
			stack: [{ html: editorRef!.innerHTML, selection: null, kind: 'command', at: 0 }],
			index: 0
		};
		ref = handle;
		emit();
		reportHistory();
		ready = true;
		if (initial.autoFocus) {
			editorRef!.focus();
			writeOffsets(editorRef!, null);
		}
		let frame = 0;
		const changed = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(sync);
		};
		const up = () => {
			if (!dragging) return;
			dragging = false;
			changed();
		};
		const down = (event: PointerEvent) => {
			if (
				face === 'link' &&
				!rootRef?.querySelector(`[data-toolbar="${uid}"]`)?.contains(event.target as Node)
			) {
				savedRange = null;
				face = 'format';
				bar = null;
			}
		};
		document.addEventListener('selectionchange', changed);
		document.addEventListener('pointerup', up);
		document.addEventListener('pointerdown', down);
		return () => {
			cancelAnimationFrame(frame);
			cancelAnimationFrame(placedFrame);
			document.removeEventListener('selectionchange', changed);
			document.removeEventListener('pointerup', up);
			document.removeEventListener('pointerdown', down);
			ref = null;
		};
	});
	$effect(() => {
		const next = value;
		if (!ready) return;
		untrack(() => {
			if (next === undefined || next === lastEmitted) return;
			load(next);
			record('command');
			emit();
		});
	});
	function physical(visualDuration: number, bounce: number) {
		const root = (2 * Math.PI) / (visualDuration * 1.2);
		return { stiffness: root * root, damping: 2 * (1 - bounce) * root, mass: 1 };
	}
	const MORPH = physical(0.42, 0.12),
		GLIDE = physical(0.3, 0.08),
		GROW = physical(0.4, 0);
	const tx = new TargetSpring(0, GLIDE),
		ty = new TargetSpring(0, GLIDE);
	const tw = new TargetSpring(0, MORPH),
		th = new TargetSpring(0, MORPH),
		hy = new TargetSpring(0, GLIDE),
		hh = new TargetSpring(0, GLIDE),
		panelHeight = new TargetSpring(0, GROW);
	let shown = $state(false);
	let placedFrame = 0,
		targetSize = { width: 0, height: 0 };
	function reportFaceSize(node: HTMLElement) {
		const width = node.offsetWidth,
			height = node.offsetHeight;
		targetSize = { width, height };
		const instant = !shown || reduced || tw.current === 0;
		void tw.set(width, { instant });
		void th.set(height, { instant });
	}
	function onFaceSize(node: HTMLDivElement) {
		const currentFace = node.dataset.face;
		const fit = () => {
			if (currentFace === face && !node.inert) reportFaceSize(node);
		};
		untrack(fit);
		const observer = new ResizeObserver(fit);
		observer.observe(node);
		return () => observer.disconnect();
	}
	// A keyed face can return during its outro without resizing. ResizeObserver alone does not report that resurrection.
	$effect(() => {
		const current = face;
		if (!toolbarOpen) return;
		const frame = requestAnimationFrame(() => {
			const node = rootRef?.querySelector<HTMLElement>(
				`[data-toolbar]:not([inert]) [data-face="${current}"]:not([inert])`
			);
			if (node) reportFaceSize(node);
		});
		return () => cancelAnimationFrame(frame);
	});

	$effect(() => {
		const at = bar;
		const reduce = reduced;
		untrack(() => {
			cancelAnimationFrame(placedFrame);
			if (!at) {
				shown = false;
				return;
			}
			const half = (targetSize.width || 280) / 2;
			const x = rootRef ? Math.max(half + 4, Math.min(at.x, rootRef.offsetWidth - half - 4)) : at.x;
			const instant = !shown || reduce;
			void tx.set(x, { instant });
			void ty.set(at.y, { instant });
			if (instant)
				placedFrame = requestAnimationFrame(() => {
					void tx.set(x, { instant: true });
					void ty.set(at.y, { instant: true });
					shown = true;
				});
		});
	});
	const toolbarOpen = $derived(!!bar && !readOnly);
	const direction = $derived(face === 'link' ? 1 : -1);
	let listRef = $state<HTMLElement | null>(null),
		panelBody = $state<HTMLDivElement>(),
		slashPanel = $state<HTMLDivElement>();
	let panelSized = false,
		highlightPlaced = false;
	const slashMax = $derived(slash?.max ?? 320);
	$effect(() => {
		const open = slashOpen;
		const index = slashIndex;
		void slashResults;
		const reduce = reduced;
		const list = listRef;
		untrack(() => {
			if (!open) {
				panelSized = false;
				highlightPlaced = false;
				return;
			}
			const row = list?.querySelector<HTMLElement>(`[data-index="${index}"]`);
			if (!row) return;
			const instant = reduce || !highlightPlaced || hh.current === 0;
			void hy.set(row.offsetTop, { instant });
			void hh.set(row.offsetHeight, { instant });
			highlightPlaced = true;
			const panel = slashPanel;
			if (panel) {
				const top = row.offsetTop + 6,
					bottom = top + row.offsetHeight;
				if (top - 6 < panel.scrollTop) panel.scrollTop = top - 6;
				else if (bottom + 6 > panel.scrollTop + panel.clientHeight)
					panel.scrollTop = bottom + 6 - panel.clientHeight;
			}
		});
	});
	$effect(() => {
		const body = panelBody;
		const max = slashMax;
		const open = slashOpen;
		const reduce = reduced;
		if (!body || !open) return;
		const fit = () => {
			const target = Math.min(body.offsetHeight, max);
			const instant = !panelSized || reduce;
			void panelHeight.set(target, { instant });
			panelSized = true;
		};
		untrack(fit);
		const observer = new ResizeObserver(fit);
		observer.observe(body);
		return () => observer.disconnect();
	});
	function surfaceIn(below: boolean, scale: number): SwapParams {
		return reduced
			? { duration: m.duration.fast, easing: easeOut }
			: {
					scale,
					y: below ? -4 : 4,
					...m.spring.snappy,
					fade: { duration: m.duration.fast, easing: m.ease.enter }
				};
	}
	function surfaceOut(scale: number): SwapParams {
		return reduced
			? { duration: m.duration.fast, easing: easeOut }
			: { scale, duration: m.duration.exit * 0.8, easing: m.ease.standard };
	}
	const faceIn = $derived<SwapParams>(
		reduced
			? { duration: 140 }
			: {
					x: direction * 18,
					blur: m.blur.subtle,
					...springCurve(MORPH, 18),
					fade: { duration: 200, easing: m.ease.enter, delay: 30 }
				}
	);
	const faceOut = $derived<SwapParams>(
		reduced
			? { duration: 100 }
			: {
					x: direction * -18,
					blur: m.blur.subtle,
					...springCurve(MORPH, 18),
					fade: { duration: 120, easing: m.ease.standard }
				}
	);
	const tools = $derived([
		{
			label: 'Bold',
			pressed: formats.bold,
			shortcut: '⌘B',
			icon: Bold,
			press: () => toggleMark('bold')
		},
		{
			label: 'Italic',
			pressed: formats.italic,
			shortcut: '⌘I',
			icon: Italic,
			press: () => toggleMark('italic')
		},
		{
			label: 'Strikethrough',
			pressed: formats.strike,
			shortcut: '⌘⇧X',
			icon: Strikethrough,
			press: () => toggleMark('strike')
		},
		{
			label: 'Inline code',
			pressed: formats.code,
			shortcut: '⌘E',
			icon: Code,
			press: () => toggleMark('code')
		},
		{
			label: formats.link ? 'Edit link' : 'Link',
			pressed: !!formats.link,
			shortcut: '⌘K',
			icon: Link,
			press: openLink
		}
	]);
	const blockTools = $derived([
		{ label: 'Heading 1', type: 'h1', icon: Heading1 },
		{ label: 'Heading 2', type: 'h2', icon: Heading2 },
		{ label: 'Quote', type: 'blockquote', icon: Quote }
	] as const);
	function toolbarKey(event: KeyboardEvent) {
		if (face === 'format' && event.key === 'Escape') {
			event.preventDefault();
			editorRef?.focus();
			sync();
		}
	}
	const optionId = (index: number) => `${uid}-slash-${index}`;
</script>

<Command.Root
	shouldFilter={false}
	disablePointerSelection
	vimBindings={false}
	disableInitialScroll
	value={slashResults[slashIndex]?.type ?? ''}
>
	{#snippet child({ props })}
		{@const attributes = { ...props, role: undefined, tabindex: undefined }}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Command root semantics are omitted around the native editor.) -->
		<div
			{...attributes}
			onkeydown={undefined}
			bind:this={rootRef}
			class={['arc-rich-text-editor__root', className]}
			{style}
		>
			<div
				bind:this={editorRef}
				class="arc-rich-text-editor__editor"
				style={`--placeholder: ${JSON.stringify(placeholder)}; --hint: ${JSON.stringify(blockHint)}`}
				tabindex={readOnly ? undefined : 0}
				contenteditable={!readOnly}
				role="textbox"
				aria-multiline="true"
				aria-label={ariaLabel}
				aria-readonly={readOnly || undefined}
				aria-controls={slashOpen ? `${uid}-slash` : undefined}
				aria-activedescendant={slashOpen ? optionId(slashIndex) : undefined}
				data-empty={empty || undefined}
				spellcheck="true"
				onbeforeinput={onBeforeInput}
				oninput={onInput}
				onkeydown={onKeyDown}
				onpaste={onPaste}
				ondrop={(event) => event.preventDefault()}
				onpointerdown={() => {
					dragging = true;
				}}
				oncompositionend={() => {
					record('type', true);
					emit();
				}}
			></div>
			<span class="arc-rich-text-editor__srOnly" aria-live="polite">{announce}</span>
			{#if toolbarOpen && bar}
				<div
					tabindex={-1}
					data-toolbar={uid}
					role="toolbar"
					aria-label="Formatting"
					class="arc-rich-text-editor__toolbar"
					data-below={bar.below || undefined}
					style:left={tx.current + 'px'}
					style:top={ty.current + 'px'}
					style:width={tw.current + 'px'}
					style:height={th.current + 'px'}
					style:visibility={tw.current > 0 ? 'visible' : 'hidden'}
					style:transform-origin={bar.below ? '50% 0' : '50% 100%'}
					in:swap={surfaceIn(bar.below, 0.94)}
					out:swap={surfaceOut(0.96)}
					onkeydown={toolbarKey}
				>
					{#key face}
						<div
							class="arc-rich-text-editor__face"
							data-face={face}
							{@attach onFaceSize}
							in:swap={{ ...faceIn, skip: !shown }}
							out:swap={faceOut}
						>
							{#if face === 'format'}
								<Toolbar.Root
									role={undefined}
									class="arc-rich-text-editor__row"
									aria-label="Formatting"
									loop
								>
									{#snippet child({ props: toolbarProps })}
										<div {...toolbarProps} role={undefined}>
											{#each tools as tool (tool.label)}
												<ToolButton
													class="arc-rich-text-editor__tool"
													aria-label={tool.label}
													aria-pressed={tool.pressed}
													title={tool.label + ' (' + tool.shortcut + ')'}
													onmousedown={(event) => event.preventDefault()}
													onclick={tool.press}
													><tool.icon size={16} strokeWidth={1.75} aria-hidden="true" /></ToolButton
												>
											{/each}
											<span class="arc-rich-text-editor__blockTools"
												><span class="arc-rich-text-editor__divider" aria-hidden="true"></span>
												{#each blockTools as tool (tool.type)}<ToolButton
														class="arc-rich-text-editor__tool"
														aria-label={tool.label}
														aria-pressed={formats.block === tool.type}
														title={tool.label}
														onmousedown={(event) => event.preventDefault()}
														onclick={() => run(() => applyBlock(tool.type))}
														><tool.icon
															size={16}
															strokeWidth={1.75}
															aria-hidden="true"
														/></ToolButton
													>{/each}
											</span>
										</div>
									{/snippet}
								</Toolbar.Root>
							{:else}
								<form
									class="arc-rich-text-editor__linkRow"
									onsubmit={(event) => {
										event.preventDefault();
										applyLink();
									}}
								>
									<button
										type="button"
										class="arc-rich-text-editor__tool"
										aria-label="Back to formatting"
										onclick={() => closeLink()}
										><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" /></button
									>
									<input
										bind:this={linkInputRef}
										class="arc-rich-text-editor__linkInput"
										bind:value={linkDraft}
										onkeydown={(event) => {
											if (event.key === 'Escape') {
												event.preventDefault();
												event.stopPropagation();
												closeLink();
											}
										}}
										placeholder="Paste or type a link"
										aria-label="Link address"
										inputmode="url"
										autocomplete="off"
										spellcheck={false}
									/>
									{#if formats.link}<button
											type="button"
											class="arc-rich-text-editor__tool"
											aria-label="Remove link"
											onclick={() => applyLink(true)}
											><Unlink size={16} strokeWidth={1.75} aria-hidden="true" /></button
										>{/if}
									<button
										type="submit"
										class="arc-rich-text-editor__apply"
										aria-label="Apply link"
										data-ready={!!linkDraft.trim() || undefined}
										><Check size={16} strokeWidth={2} aria-hidden="true" /></button
									>
								</form>
							{/if}
						</div>
					{/key}
				</div>
			{/if}
			{#if slashOpen && slash}
				<div
					role="presentation"
					bind:this={slashPanel}
					class="arc-rich-text-editor__slash"
					data-above={slash.above || undefined}
					style:left={slash.x + 'px'}
					style:top={slash.y + 'px'}
					style:height={panelHeight.current ? panelHeight.current + 'px' : 'auto'}
					style:max-height={slashMax + 'px'}
					style:transform-origin={slash.above ? '16px 100%' : '16px 0'}
					in:swap={surfaceIn(!slash.above, 0.96)}
					out:swap={surfaceOut(0.97)}
					onmousedown={(event) => event.preventDefault()}
				>
					<div bind:this={panelBody} class="arc-rich-text-editor__slashBody">
						<Command.List id={uid + '-slash'} aria-label="Blocks" bind:ref={listRef}>
							{#snippet child({ props: listProps })}
								<ul {...listProps} role="listbox" class="arc-rich-text-editor__slashList">
									<li
										aria-hidden="true"
										class="arc-rich-text-editor__slashHighlight"
										style:transform={'translateY(' + hy.current + 'px)'}
										style:height={hh.current + 'px'}
									></li>
									{#each slashResults as item, index (item.type)}
										<Command.Item
											id={optionId(index)}
											value={item.type}
											onSelect={() => chooseSlash(item)}
										>
											{#snippet child({ props: itemProps })}
												<li
													{...itemProps}
													role="option"
													aria-selected={index === slashIndex}
													data-index={index}
													class="arc-rich-text-editor__slashOption"
													onpointermove={() => {
														if (index !== slashIndex) slashActive = index;
													}}
												>
													<span class="arc-rich-text-editor__slashIcon"
														><item.icon size={16} strokeWidth={1.75} aria-hidden="true" /></span
													><span class="arc-rich-text-editor__slashLabel">{item.label}</span
													>{#if item.hint}<kbd class="arc-rich-text-editor__slashHint"
															>{item.hint}</kbd
														>{/if}
												</li>
											{/snippet}
										</Command.Item>
									{/each}
								</ul>
							{/snippet}
						</Command.List>
					</div>
				</div>
			{/if}
		</div>
	{/snippet}
</Command.Root>
