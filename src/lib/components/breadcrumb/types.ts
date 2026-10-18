export interface BreadcrumbItem {
	label: string;
	href?: string;
	/** Runs when the crumb is chosen. Without an href the crumb renders as a button, for paths that live in local state. */
	onclick?: (event: MouseEvent) => void;
}
export interface BreadcrumbProps {
	items: BreadcrumbItem[];
	ariaLabel?: string;
}
