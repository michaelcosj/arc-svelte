export type ThemeSwitchVariant = 'reveal' | 'eclipse' | 'split' | 'rise';
export type Theme = 'light' | 'dark';

export interface ThemeSwitchProps {
	theme: Theme;
	variant?: ThemeSwitchVariant;
	onThemeChange: (next: Theme, variant: ThemeSwitchVariant, trigger: HTMLElement) => void;
	/** Accessible name; defaults to "Switch to <next> mode". */
	label?: string;
	iconOnly?: boolean;
}
