export interface AvatarGroupMember {
	name: string;
	src?: string;
	status?: 'online' | 'offline';
}
export interface AvatarGroupProps {
	members: AvatarGroupMember[];
	max?: number;
	size?: 'sm' | 'md' | 'lg';
	label?: string;
}
