export const storageKey = (id: string) => `arc-announcement:${id}`;
/** Forget a remembered campaign dismissal. Blocked storage is harmless. */
export function clearAnnouncementDismissal(id: string) {
	try {
		window.localStorage.removeItem(storageKey(id));
	} catch {
		/* Storage can be blocked. */
	}
}
