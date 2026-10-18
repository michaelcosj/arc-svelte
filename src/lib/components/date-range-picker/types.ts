export interface DateRange {
	start: Date;
	end: Date;
}

/** A shortcut in the preset rail. `range` receives the viewer's local today. */
export interface DateRangePreset {
	label: string;
	range: (today: Date) => DateRange;
}

/**
 * A range picker whose trigger grows into the panel it opens. The panel shows two months beside a preset rail, or one
 * month with a scrolling preset row when space is tight. The range highlight stretches across each week as you hover
 * or move with the keyboard, the ends glide between days, months slide in the direction you travel, and on Apply the
 * formatted label flies back into the trigger as the surface shrinks around it.
 * Use it for reports, filters, and bookings where a start and end date are chosen together.
 */
export interface DateRangePickerProps {
	/** Controlled value. Pass `null` for no selection. */
	value?: DateRange | null;
	/** Uncontrolled starting value. */
	defaultValue?: DateRange | null;
	/** Called with the applied range. */
	onChange?: (range: DateRange) => void;
	/** Accessible name of the trigger and the dialog. Defaults to "Date range". */
	label?: string;
	placeholder?: string;
	presets?: DateRangePreset[];
	minDate?: Date;
	maxDate?: Date;
	/** 0 is Sunday, 1 is Monday. Defaults to 0. */
	weekStartsOn?: 0 | 1;
	locale?: string;
	/** Force one or two months. `auto` picks two when the boundary is wide enough. */
	months?: 'auto' | 1 | 2;
	/** The element the panel should stay inside. Defaults to the viewport. */
	boundary?: () => HTMLElement | null;
	class?: import('svelte/elements').ClassValue;
}
