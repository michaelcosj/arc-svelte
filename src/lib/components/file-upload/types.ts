export type FileUploadItem = { id: string; file: File; error?: string };
export interface FileUploadProps {
	accept?: string;
	disabled?: boolean;
	label?: string;
	description?: string;
	multiple?: boolean;
	maxSize?: number;
	value?: FileUploadItem[];
	onChange?: (files: FileUploadItem[]) => void;
	onUpload?: (
		file: File,
		options: { onProgress: (percent: number) => void; signal: AbortSignal }
	) => Promise<void>;
}
export type Upload = { status: 'uploading' | 'done' | 'failed'; progress: number };
