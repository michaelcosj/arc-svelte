export interface MoneyInputDetails {
	currency: string;
	/** The amount in major units, such as 12.5 for $12.50. */
	major: number | null;
	/** The amount as a full currency string, such as "$12.50". */
	formatted: string;
}

export interface MoneyInputProps {
	label: string;
	hideLabel?: boolean;
	/** Amount in minor units (cents for USD, yen for JPY). `null` is empty. */
	value?: number | null;
	defaultValue?: number | null;
	onValueChange?: (value: number | null, details: MoneyInputDetails) => void;
	/** ISO 4217 code, such as "USD". */
	currency?: string;
	defaultCurrency?: string;
	onCurrencyChange?: (currency: string) => void;
	/** Codes offered by the currency menu. Pass one code to hide the menu. */
	currencies?: string[];
	/** Lowest amount in minor units. Checked when the field loses focus. */
	min?: number;
	/** Highest amount in minor units. Typing past it is refused with a nudge. */
	max?: number;
	/** Quick add chips in major units. Pass an empty array to hide them. */
	quickAdd?: number[];
	/** Arrow keys move by this many minor units. Defaults to one major unit; Shift moves ten times as far. */
	step?: number;
	/** Formatting locale. Fixed by default so server and client render the same digits. */
	locale?: string;
	description?: string;
	/** Replaces the built-in range message. */
	error?: string;
	disabled?: boolean;
	/** Adds a hidden input carrying the amount in minor units. */
	name?: string;
	id?: string;
	class?: import('svelte/elements').ClassValue;
	ref?: HTMLInputElement | null;
	onblur?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
}
