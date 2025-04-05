/**
 * Utility functions for file handling, compression, and optimization
 */

// Maximum dimensions for image resizing
const MAX_IMAGE_WIDTH = 1280;
const MAX_IMAGE_HEIGHT = 1024;

// Maximum file size in bytes (5MB default)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// JPEG compression quality (0-1)
const JPEG_QUALITY = 0.8;

// WebP compression quality (0-1)
const WEBP_QUALITY = 0.85;

/**
 * Process files before upload to reduce size
 * @param files Array of files to process
 * @returns Promise with processed files
 */
export async function processFilesBeforeUpload(files: File[]): Promise<File[]> {
    const processedFiles: File[] = [];

    for (const file of files) {
        let processedFile: File;

        // Skip if file is smaller than 50KB
        if (file.size < 50 * 1024) {
            processedFiles.push(file);
            continue;
        }

        if (file.type.startsWith('image/')) {
            // Process images (resize and compress)
            try {
                processedFile = await processImage(file);
                processedFiles.push(processedFile);
            } catch (error) {
                console.error(`Error processing image ${file.name}:`, error);
                // Fall back to original file if processing fails
                processedFiles.push(file);
            }
        } else if (file.type === 'application/pdf') {
            // Just check if PDF size is under limit
            if (file.size > MAX_FILE_SIZE) {
                console.warn(`PDF ${file.name} is too large (${formatFileSize(file.size)}). Consider optimizing it.`);
            }
            processedFiles.push(file);
        } else {
            // Pass through other file types
            processedFiles.push(file);
        }
    }

    return processedFiles;
}

/**
 * Process an image file to resize and compress it
 * @param imageFile The original image file
 * @returns Promise with processed image file
 */
async function processImage(imageFile: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // Calculate new dimensions while maintaining aspect ratio
            let width = img.width;
            let height = img.height;

            if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
                if (width / height > MAX_IMAGE_WIDTH / MAX_IMAGE_HEIGHT) {
                    // Width is the limiting factor
                    height = Math.round(height * (MAX_IMAGE_WIDTH / width));
                    width = MAX_IMAGE_WIDTH;
                } else {
                    // Height is the limiting factor
                    width = Math.round(width * (MAX_IMAGE_HEIGHT / height));
                    height = MAX_IMAGE_HEIGHT;
                }
            }

            // Skip resizing if dimensions are the same
            if (width === img.width && height === img.height && imageFile.size <= MAX_FILE_SIZE) {
                URL.revokeObjectURL(img.src);
                resolve(imageFile);
                return;
            }

            // Create canvas and resize image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(img.src);
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Draw image on canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Determine output format
            let outputType = imageFile.type;
            let quality = JPEG_QUALITY;

            if (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg') {
                outputType = 'image/jpeg';
                quality = JPEG_QUALITY;
            } else if (imageFile.type === 'image/png') {
                // Try to convert PNG to WebP if browser supports it
                if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
                    outputType = 'image/webp';
                    quality = WEBP_QUALITY;
                }
            } else if (imageFile.type === 'image/webp') {
                outputType = 'image/webp';
                quality = WEBP_QUALITY;
            }

            // Convert canvas to blob
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        URL.revokeObjectURL(img.src);
                        reject(new Error('Could not create image blob'));
                        return;
                    }

                    // Create new file with same name but processed content
                    const processedFile = new File(
                        [blob],
                        imageFile.name,
                        { type: outputType }
                    );

                    console.log(`Processed image ${imageFile.name}: ${formatFileSize(imageFile.size)} → ${formatFileSize(processedFile.size)}`);

                    URL.revokeObjectURL(img.src);
                    resolve(processedFile);
                },
                outputType,
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error(`Failed to load image: ${imageFile.name}`));
        };

        img.src = URL.createObjectURL(imageFile);
    });
}

/**
 * Format file size in human-readable format
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}