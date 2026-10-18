import type { HTMLButtonAttributes, ClassValue } from 'svelte/elements';
import type { CalendarDateMatcher } from '../calendar/types';
export interface DatePickerProps extends Omit<
	HTMLButtonAttributes,
	'value' | 'onchange' | 'class'
> {
	label: string;
	value?: Date;
	onChange?: (date: Date | undefined) => void;
	description?: string;
	placeholder?: string;
	minDate?: Date;
	maxDate?: Date;
	disabledDates?: CalendarDateMatcher;
	locale?: string;
	format?: Intl.DateTimeFormatOptions;
	showToday?: boolean;
	class?: ClassValue;
}
