import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export type UserStatus = 'available' | 'busy' | 'away';
export type ThemePreference = 'light' | 'dark' | 'system';
export const userStatuses: { value: UserStatus; label: string }[] = [
	{ value: 'available', label: 'Available' },
	{ value: 'busy', label: 'Busy' },
	{ value: 'away', label: 'Away' }
];
export interface UserMenuUser {
	name: string;
	email: string;
	plan?: string;
	avatarSrc?: string;
	avatarSrcSet?: string;
}
export interface UserMenuItem {
	label: string;
	icon?: Snippet;
	keys?: string[];
	onSelect?: () => void;
}
export interface UserMenuProps {
	user: UserMenuUser;
	status?: UserStatus;
	defaultStatus?: UserStatus;
	onStatusChange?: (status: UserStatus) => void;
	theme?: ThemePreference;
	defaultTheme?: ThemePreference;
	onThemeChange?: (theme: ThemePreference) => void;
	showTheme?: boolean;
	items?: UserMenuItem[];
	onSignOut?: () => void | Promise<unknown>;
	signOutKeys?: string[];
	align?: 'start' | 'center' | 'end';
	showName?: boolean;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	portal?: boolean;
	ref?: HTMLButtonElement | null;
	class?: ClassValue;
}
