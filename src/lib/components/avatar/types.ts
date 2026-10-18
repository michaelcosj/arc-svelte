import type { ClassValue, HTMLAttributes } from 'svelte/elements';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline';

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'class'> {
	/** Full name. Used for the accessible label and the first two initials. */
	name: string;
	/** Image URL. Falls back to initials if it fails to load. */
	src?: string;
	size?: AvatarSize;
	/** Adds a presence dot and appends the status to the label. */
	status?: AvatarStatus;
	class?: ClassValue;
	ref?: HTMLSpanElement | null;
}
