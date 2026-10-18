import type { PhoneCountry, PhoneStatus } from './phone';
export interface PhoneInputDetails {
	country: PhoneCountry;
	/** The number as shown in the field, without the calling code. */
	formatted: string;
	status: PhoneStatus;
	valid: boolean;
}

export interface PhoneInputProps {
	label: string;
	hideLabel?: boolean;
	/** The number in E.164, such as "+14155550132". An empty string clears the field. */
	value?: string;
	defaultValue?: string;
	/** Fires on every edit with the E.164 number (empty when there are no digits) and its parsed details. */
	onValueChange?: (value: string, details: PhoneInputDetails) => void;
	/** ISO code of the selected country. */
	country?: string;
	/** ISO code used until someone picks a country or enters an international number. */
	defaultCountry?: string;
	onCountryChange?: (iso: string) => void;
	/** Limit the picker to these ISO codes. */
	countries?: string[];
	/** Pinned at the top of the picker under "Suggested". */
	preferredCountries?: string[];
	description?: string;
	/** Replaces the built-in validation message. */
	error?: string;
	/** Show a message after blur when the number is incomplete. On by default. */
	validate?: boolean;
	disabled?: boolean;
	required?: boolean;
	/** Adds a hidden input carrying the E.164 value for native form submission. */
	name?: string;
	id?: string;
	class?: import('svelte/elements').ClassValue;
	ref?: HTMLInputElement | null;
	onblur?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
}
