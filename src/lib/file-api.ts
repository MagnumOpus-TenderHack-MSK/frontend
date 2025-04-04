import { ApiService } from './api-service';
import { FileUploadResponse, FileList, FileData, FileType } from './types';

export class FileApi {
    static async getFiles(skip: number = 0, limit: number = 20): Promise<FileList> {
        try {
            return await ApiService.get<FileList>('/files', { skip, limit });
        } catch (error) {
            console.error('Error fetching files:', error);
            throw error;
        }
    }

    static async getFile(fileId: string): Promise<FileData> {
        try {
            return await ApiService.get<FileData>(`/files/${fileId}`);
        } catch (error) {
            console.error(`Error fetching file ${fileId}:`, error);
            throw error;
        }
    }

    static async uploadFile(
        file: File,
        onProgress?: (percentage: number) => void
    ): Promise<FileUploadResponse> {
        try {
            console.log(`Uploading file: ${file.name} (${file.size} bytes)`);
            const fileType = determineFileType(file);
            console.log(`Determined file type: ${fileType}`);

            const response = await ApiService.uploadFile<FileUploadResponse>(
                '/files/upload',
                file,
                onProgress
            );

            console.log('File upload successful:', response);
            return response;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    static async uploadMultipleFiles(
        files: File[],
        onProgress?: (percentage: number) => void
    ): Promise<FileUploadResponse[]> {
        try {
            console.log(`Uploading ${files.length} files`);

            const response = await ApiService.uploadMultipleFiles<FileUploadResponse[]>(
                '/files/upload-multiple',
                files,
                onProgress
            );

            console.log('Multiple files upload successful:', response);
            return response;
        } catch (error) {
            console.error('Error uploading multiple files:', error);
            throw error;
        }
    }

    static getFileDownloadUrl(fileId: string): string {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        return `${baseURL}/files/${fileId}/download`;
    }

    static getFilePreviewUrl(fileId: string): string {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        return `${baseURL}/files/${fileId}/preview`;
    }

    static getFileTypeAsString(fileType: FileType): string {
        switch (fileType) {
            case FileType.TEXT:
                return 'TEXT';
            case FileType.IMAGE:
                return 'IMAGE';
            case FileType.PDF:
                return 'PDF';
            case FileType.WORD:
                return 'WORD';
            case FileType.EXCEL:
                return 'EXCEL';
            default:
                return 'OTHER';
        }
    }
}

// Helper function to determine file type based on MIME type and extension
export function determineFileType(file: File): FileType {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    // Image files
    if (mimeType.startsWith('image/')) {
        return FileType.IMAGE;
    }

    // PDF files
    if (mimeType === 'application/pdf') {
        return FileType.PDF;
    }

    // Text files
    if (mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        fileName.endsWith('.md') ||
        fileName.endsWith('.txt')) {
        return FileType.TEXT;
    }

    // Word documents
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword' ||
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc')) {
        return FileType.WORD;
    }

    // Excel spreadsheets
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel' ||
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.csv')) {
        return FileType.EXCEL;
    }

    // Default to OTHER for unknown file types
    return FileType.OTHER;
}

export default FileApi;