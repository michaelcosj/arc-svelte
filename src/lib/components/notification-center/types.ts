export interface NotificationItem {
	id: string;
	title: string;
	description?: string;
	time: string;
	read?: boolean;
	tone?: 'info' | 'success' | 'warning';
	/** A local portrait asset for person-generated updates. */
	actor?: { name: string; photo: string };
}

export interface NotificationCenterProps {
	notifications: NotificationItem[];
	label?: string;
	onReadChange?: (notification: NotificationItem, read: boolean) => void;
	onDismiss?: (notification: NotificationItem) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	avoidCollisions?: boolean;
}
