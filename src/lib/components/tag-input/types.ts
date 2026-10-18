export interface TagInputProps {
	label: string;
	value?: string[];
	defaultValue?: string[];
	/** With `value`, the callback owns updates. Without it, use `bind:value`. */
	onValueChange?: (value: string[]) => void;
	placeholder?: string;
	description?: string;
	id?: string;
}
