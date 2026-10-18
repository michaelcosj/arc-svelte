import type { ClassValue } from 'svelte/elements';

export type CalendarDateMatcher = (date: Date) => boolean;
export interface CalendarProps {
	value?: Date;
	onChange?: (date: Date) => void;
	month?: Date;
	onMonthChange?: (month: Date) => void;
	minDate?: Date;
	maxDate?: Date;
	disabledDates?: CalendarDateMatcher;
	locale?: string;
	class?: ClassValue;
	showToday?: boolean;
	ref?: HTMLElement | null;
}
