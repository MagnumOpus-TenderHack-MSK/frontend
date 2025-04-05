import { ApiService } from './api-service';
import { FileUploadResponse, FileList, FileData, FileType } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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

            // Use FormData for file uploads
            const formData = new FormData();
            formData.append('file', file);

            // Get token for authorization
            const token = localStorage.getItem('jwt_token');
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Create the request manually to monitor progress
            const xhr = new XMLHttpRequest();

            return new Promise((resolve, reject) => {
                xhr.open('POST', `${API_BASE_URL}/files/upload`);

                // Set headers
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }

                // Track upload progress
                xhr.upload.onprogress = (event) => {
                    if (onProgress && event.total) {
                        const percentage = Math.round((event.loaded * 100) / event.total);
                        onProgress(percentage);
                    }
                };

                // Handle response
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            console.log('File upload successful:', response);
                            resolve(response);
                        } catch (error) {
                            reject(new Error('Invalid response format'));
                        }
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
                    }
                };

                xhr.onerror = () => {
                    reject(new Error('Network error during upload'));
                };

                // Send the form data
                xhr.send(formData);
            });
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

            // Upload files individually for better error handling
            const results: FileUploadResponse[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const response = await this.uploadFile(file, (progress) => {
                        if (onProgress) {
                            // Normalize progress across all files
                            const overallProgress = Math.round((i * 100 + progress) / files.length);
                            onProgress(overallProgress);
                        }
                    });
                    results.push(response);
                } catch (error) {
                    console.error(`Error uploading file ${file.name}:`, error);
                    // Continue with other files
                }
            }

            return results;
        } catch (error) {
            console.error('Error uploading multiple files:', error);
            throw error;
        }
    }

    static getFileDownloadUrl(fileId: string): string {
        return `${API_BASE_URL}/files/${fileId}/download`;
    }

    static getFilePreviewUrl(fileId: string): string {
        return `${API_BASE_URL}/files/${fileId}/preview`;
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