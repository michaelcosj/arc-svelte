export type FileDropzoneStatus = 'uploading' | 'uploaded' | 'failed';
/** A selection or upload. Visitor-added image previews are owned and released by the dropzone. */
export interface FileDropzoneItem {
	id: string;
	name: string;
	size: number;
	status?: FileDropzoneStatus;
	progress?: number;
	error?: string;
	retryable?: boolean;
	file?: File;
	preview?: string;
}
export type FileDropzoneUpload = (
	item: FileDropzoneItem,
	options: { onProgress: (percent: number) => void; signal: AbortSignal }
) => Promise<void>;
export interface FileDropzoneProps {
	accept?: string;
	multiple?: boolean;
	maxFiles?: number;
	onFilesChange?: (files: File[]) => void;
	label?: string;
	description?: string;
	defaultItems?: FileDropzoneItem[];
	onUpload?: FileDropzoneUpload;
	maxSize?: number;
	listPlacement?: 'below' | 'inside';
	note?: string;
	dropLabel?: string;
	compactAt?: number;
}
