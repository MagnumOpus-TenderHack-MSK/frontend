"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, PhoneCall, Paperclip, X, File, FileText, FileImage, HelpCircle, Search, AlertTriangle, UserPlus, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageSuggestion } from "@/lib/types";

// Get icon for suggestion based on its icon property
const getIconForSuggestion = (suggestion: MessageSuggestion) => {
    switch (suggestion.icon) {
        case 'user-plus':
            return <UserPlus size={14} className="text-blue-500 flex-shrink-0" />;
        case 'search':
            return <Search size={14} className="text-green-500 flex-shrink-0" />;
        case 'help-circle':
            return <HelpCircle size={14} className="text-purple-500 flex-shrink-0" />;
        case 'file-text':
            return <FileText size={14} className="text-orange-500 flex-shrink-0" />;
        case 'alert-triangle':
            return <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />;
        default:
            return <MessageSquare size={14} className="text-gray-500 flex-shrink-0" />;
    }
};

interface FilePreview {
    file: File;
    previewUrl?: string;
    previewText?: string;
}

interface ChatInputProps {
    onSendMessage: (message: string, files?: File[]) => void;
    onRequestSupport: () => void;
    isLoading: boolean;
    isTyping: boolean;
    isUploading?: boolean;
    suggestions?: MessageSuggestion[];
    onSuggestionClick?: (text: string) => void;
}

export function ChatInput({
                              onSendMessage,
                              onRequestSupport,
                              isLoading,
                              isTyping,
                              isUploading = false,
                              suggestions,
                              onSuggestionClick
                          }: ChatInputProps) {
    const [input, setInput] = useState("");
    const [files, setFiles] = useState<FilePreview[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isUploading) return;
        if (!input.trim() && files.length === 0) return;

        onSendMessage(input, files.length > 0 ? files.map(f => f.file) : undefined);
        setInput("");
        setFiles([]);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dragActive) setDragActive(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (isUploading || isTyping || isLoading) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));

            // Reset the input so the same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFiles = async (newFiles: File[]) => {
        // Process each file to create previews
        const filePromises = newFiles.map(file => processFile(file));

        try {
            const newFilePreviews = await Promise.all(filePromises);
            setFiles(prev => [...prev, ...newFilePreviews]);
        } catch (error) {
            console.error('Error processing files:', error);
        }
    };

    const processFile = async (file: File): Promise<FilePreview> => {
        const preview: FilePreview = { file };

        // Generate preview for image files
        if (file.type.startsWith('image/')) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.previewUrl = e.target?.result as string;
                    resolve(preview);
                };
                reader.onerror = () => {
                    resolve(preview); // Resolve without preview on error
                };
                reader.readAsDataURL(file);
            });
        }
        // Generate preview for text files
        else if (file.type.startsWith('text/') ||
            file.type === 'application/json' ||
            file.name.endsWith('.md') ||
            file.name.endsWith('.csv') ||
            file.name.endsWith('.txt')) {
            try {
                const text = await file.text();
                // Get first few lines (up to 100 characters)
                preview.previewText = text.substring(0, 100) + (text.length > 100 ? '...' : '');
            } catch (error) {
                console.error('Error reading text file:', error);
            }
        }

        return preview;
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prevFiles => {
            // Clean up any object URLs to prevent memory leaks
            const fileToRemove = prevFiles[index];
            if (fileToRemove.previewUrl && fileToRemove.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(fileToRemove.previewUrl);
            }

            // Remove file from array
            return prevFiles.filter((_, i) => i !== index);
        });
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Format file size for display
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Get file icon based on type
    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) {
            return <FileImage size={18} className="text-blue-500" />;
        } else if (file.type.startsWith('text/') ||
            file.type === 'application/json' ||
            file.name.endsWith('.md') ||
            file.name.endsWith('.txt')) {
            return <FileText size={18} className="text-green-500" />;
        }
        return <File size={18} className="text-gray-500" />;
    };

    // Clean up object URLs when component unmounts
    useEffect(() => {
        return () => {
            files.forEach(file => {
                if (file.previewUrl && file.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(file.previewUrl);
                }
            });
        };
    }, []);

    return (
        <div
            className={`border-t border-gray-200 dark:border-gray-700 p-4 ${dragActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Chat suggestions */}
            {suggestions && suggestions.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 justify-center">
                    {suggestions.slice(0, 3).map((suggestion) => (
                        <button
                            key={suggestion.id}
                            onClick={() => onSuggestionClick && onSuggestionClick(suggestion.text)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors py-2 px-3 rounded-2xl
                         text-sm flex items-center gap-1.5 max-w-xs"
                            disabled={isLoading || isTyping || isUploading}
                        >
                            {getIconForSuggestion(suggestion)}
                            <span className="truncate">{suggestion.text}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* File attachments previews */}
            {files.length > 0 && (
                <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {files.map((filePreview, index) => (
                        <div
                            key={index}
                            className="bg-muted rounded-md p-2 flex flex-col relative"
                        >
                            {/* File preview */}
                            <div className="mb-1">
                                {filePreview.previewUrl ? (
                                    <div className="h-16 flex items-center justify-center overflow-hidden rounded">
                                        <img
                                            src={filePreview.previewUrl}
                                            alt={filePreview.file.name}
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                ) : filePreview.previewText ? (
                                    <div className="h-16 p-2 bg-background rounded text-xs overflow-hidden text-muted-foreground font-mono">
                                        {filePreview.previewText}
                                    </div>
                                ) : (
                                    <div className="h-16 flex items-center justify-center">
                                        {getFileIcon(filePreview.file)}
                                    </div>
                                )}
                            </div>

                            {/* File info */}
                            <div className="flex items-center justify-between">
                                <div className="overflow-hidden">
                                    <div className="truncate text-xs font-medium">{filePreview.file.name}</div>
                                    <div className="text-xs text-muted-foreground">{formatFileSize(filePreview.file.size)}</div>
                                </div>

                                {/* Delete button */}
                                <button
                                    onClick={() => handleRemoveFile(index)}
                                    className="p-1 bg-muted/50 hover:bg-muted-foreground/20 rounded-full"
                                    title="Удалить файл"
                                    disabled={isUploading}
                                >
                                    <X size={12} className="text-muted-foreground" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            dragActive
                                ? "Перетащите файлы сюда..."
                                : isTyping
                                    ? "Ассистент печатает..."
                                    : isUploading
                                        ? "Загрузка файлов..."
                                        : "Введите ваше сообщение..."
                        }
                        className={`w-full rounded-md border border-input bg-background px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary ${
                            dragActive ? 'border-blue-400 dark:border-blue-500' : ''
                        }`}
                        disabled={isLoading || isTyping || isUploading}
                    />
                </div>

                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                    disabled={isLoading || isTyping || isUploading}
                />

                {/* File attachment button */}
                <Button
                    type="button"
                    variant="outline"
                    onClick={triggerFileInput}
                    disabled={isLoading || isTyping || isUploading}
                    className="transition-all duration-200 hover:scale-105"
                    title="Прикрепить файл"
                >
                    {isUploading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Paperclip size={18} />
                    )}
                </Button>

                <Button
                    type="submit"
                    disabled={isLoading || isTyping || isUploading || (!input.trim() && files.length === 0)}
                    className="transition-all duration-200 hover:scale-105"
                >
                    <Send size={18} />
                </Button>

                <Button
                    type="button"
                    variant="support"
                    onClick={onRequestSupport}
                    disabled={isLoading || isTyping || isUploading}
                    className="transition-all duration-200 hover:scale-105"
                    title="Связаться с оператором"
                >
                    <PhoneCall size={18} />
                </Button>
            </form>

            {isUploading && (
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Загрузка файлов...
                </div>
            )}
        </div>
    );
}