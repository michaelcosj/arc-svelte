/** Human-readable byte size, matching the upload rows and validation messages. */
export function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	const mb = bytes / (1024 * 1024);
	return `${mb >= 10 ? Math.round(mb) : Number(mb.toFixed(1))} MB`;
}
/** Accept tokens use native picker syntax: extensions, MIME types and MIME wildcards. */
export function matchesAccept(file: File, accept?: string) {
	const types =
		accept
			?.split(',')
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean) ?? [];
	return (
		!types.length ||
		types.some((t) =>
			t.startsWith('.')
				? file.name.toLowerCase().endsWith(t)
				: t.endsWith('/*')
					? file.type.startsWith(t.slice(0, -1))
					: file.type === t
		)
	);
}
