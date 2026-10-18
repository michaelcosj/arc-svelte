export type TokenKind =
	| 'comment'
	| 'string'
	| 'number'
	| 'keyword'
	| 'type'
	| 'function'
	| 'property'
	| 'tag'
	| 'punctuation';

export interface Token {
	text: string;
	kind?: TokenKind;
}

const keywordPattern =
	/^(?:abstract|as|async|await|break|case|catch|class|const|continue|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|of|private|protected|public|readonly|return|set|static|switch|throw|try|type|typeof|var|void|while|with|yield|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)$/;
const literalPattern = /^(?:true|false|null|undefined|NaN|Infinity)$/;
const typePattern =
	/^(?:Array|Boolean|Date|Error|Map|Number|Promise|Record|Set|String|ReactNode|HTMLElement|HTMLButtonElement|Event|unknown|never|void|any|boolean|number|string|object)$/;
const tokenPattern =
	/\/\*[\s\S]*?\*\/|\/\/[^\n]*|<!--[\s\S]*?-->|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$-]*\b|[{}[\]();,.<>:=+*/!?|&-]/g;

export function normaliseLanguage(language: string) {
	return language.toLowerCase().replace(/^\./, '');
}

function tokenKind(
	value: string,
	source: string,
	index: number,
	language: string
): TokenKind | undefined {
	if (value.startsWith('//') || value.startsWith('/*') || value.startsWith('<!--'))
		return 'comment';
	if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) {
		return language === 'json' && /^\s*:/.test(source.slice(index + value.length))
			? 'property'
			: 'string';
	}
	if (/^\d/.test(value)) return 'number';
	if (keywordPattern.test(value) || literalPattern.test(value)) return 'keyword';
	if (typePattern.test(value)) return 'type';
	if (/^[{}[\]();,.<>:=+*/!?|&-]$/.test(value)) return 'punctuation';

	const before = source.slice(0, index);
	const after = source.slice(index + value.length);
	if (
		(language === 'tsx' || language === 'jsx' || language === 'html' || language === 'vue') &&
		/<\/?$/.test(before)
	)
		return 'tag';
	if (/^\s*\(/.test(after) && language !== 'json') return 'function';
	if ((language === 'css' || language === 'tsx' || language === 'jsx') && /^\s*[:=]/.test(after))
		return 'property';
	return undefined;
}

/** Lightweight highlighting: plain runs and classified tokens, in source order. */
export function highlight(code: string, language: string): Token[] {
	const parts: Token[] = [];
	let cursor = 0;
	for (const match of code.matchAll(tokenPattern)) {
		const value = match[0];
		const index = match.index ?? 0;
		if (cursor < index) parts.push({ text: code.slice(cursor, index) });
		parts.push({ text: value, kind: tokenKind(value, code, index, language) });
		cursor = index + value.length;
	}
	if (cursor < code.length) parts.push({ text: code.slice(cursor) });
	return parts;
}
