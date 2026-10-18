export function dayKey(time: number, timeZone: string) {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date(time));
	const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}

export function relative(time: number, now: number) {
	const minutes = Math.max(0, Math.floor((now - time) / 60_000));
	if (minutes < 1) return { short: 'Now', long: 'just now' };
	if (minutes < 60)
		return { short: `${minutes}m`, long: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago` };
	const hours = Math.floor(minutes / 60);
	return { short: `${hours}h`, long: `${hours} ${hours === 1 ? 'hour' : 'hours'} ago` };
}
