import { describe, expect, it } from 'vite-plus/test';
import { formatSize, matchesAccept } from './files';

describe('file upload validation', () => {
	it('accepts picker extension and MIME patterns', () => {
		const markdown = new File(['brief'], 'BRIEF.MD', { type: 'text/markdown' });
		const image = new File(['image'], 'image.png', { type: 'image/png' });
		expect(matchesAccept(markdown, ' .pdf, .md ')).toBe(true);
		expect(matchesAccept(image, 'image/*')).toBe(true);
		expect(matchesAccept(markdown, 'text/markdown')).toBe(true);
		expect(matchesAccept(image, '.pdf,.md')).toBe(false);
		expect(matchesAccept(image, '')).toBe(true);
	});
	it('formats validation size boundaries consistently with row metadata', () => {
		expect(
			[0, 1023, 1024, 1048576, Math.round(1.5 * 1048576), 10 * 1048576].map(formatSize)
		).toEqual(['0 B', '1023 B', '1 KB', '1 MB', '1.5 MB', '10 MB']);
	});
});
