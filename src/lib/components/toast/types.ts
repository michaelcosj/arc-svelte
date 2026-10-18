export interface ToastProps {
	title: string;
	description?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	duration?: number;
}
