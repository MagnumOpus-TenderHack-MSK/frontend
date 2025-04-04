"use client";

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Copy, FileText, FileImage, File, Download, ExternalLink } from "lucide-react";
import { extractDocumentReferences } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { ChatMessage as ChatMessageType, MessageType, ReactionType, FileType, FileReference } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileApi } from "@/lib/file-api";

interface MessageProps {
    message: ChatMessageType;
    onReaction?: (messageId: string, reaction: 'like' | 'dislike') => void;
}

export function ChatMessage({ message, onReaction }: MessageProps) {
    const { id, content, message_type, created_at, reactions, files } = message;
    const isUser = message_type === MessageType.USER;
    const isSystem = message_type === MessageType.SYSTEM;
    const [copied, setCopied] = useState(false);

    // Check if message has a reaction
    const hasLikeReaction = reactions?.some(r => r.reaction_type === ReactionType.LIKE);
    const hasDislikeReaction = reactions?.some(r => r.reaction_type === ReactionType.DISLIKE);

    // Get file icon based on type
    const getFileIcon = (fileType: string) => {
        if (fileType === FileType.IMAGE || fileType === 'IMAGE') {
            return <FileImage size={14} className="text-blue-500" />;
        } else if (fileType === FileType.TEXT || fileType === 'TEXT') {
            return <FileText size={14} className="text-green-500" />;
        } else if (fileType === FileType.PDF || fileType === 'PDF') {
            return <FileText size={14} className="text-red-500" />;
        } else if (fileType === FileType.WORD || fileType === 'WORD') {
            return <FileText size={14} className="text-blue-600" />;
        } else if (fileType === FileType.EXCEL || fileType === 'EXCEL') {
            return <FileText size={14} className="text-green-600" />;
        } else {
            return <File size={14} className="text-gray-500" />;
        }
    };

    // Render message content with source citations
    const renderMessageContent = () => {
        // Process content for any source citations [doc:id](text)
        let processedContent = content || "";

        // If the message doesn't contain document references, return it as-is
        if (!processedContent.includes("[doc:")) {
            return (
                <div className="whitespace-pre-wrap">{processedContent}</div>
            );
        }

        // Extract document references and split content into parts
        const docRefs = extractDocumentReferences(processedContent);

        // Replace each document reference with a component
        docRefs.forEach(ref => {
            const pattern = `\\[doc:${ref.id}\\]\\(${ref.text}\\)`;
            const regex = new RegExp(pattern, 'g');
            processedContent = processedContent.replace(regex, `__DOC_REF_${ref.id}__${ref.text}__DOC_REF_END__`);
        });

        // Split by document reference markers
        const parts = processedContent.split(/__DOC_REF_|__DOC_REF_END__/);

        return (
            <div className="whitespace-pre-wrap">
                {parts.map((part, index) => {
                    if (index % 3 === 1) {
                        // This is a document ID
                        return null;
                    } else if (index % 3 === 2) {
                        // This is the document link text
                        const docId = parts[index - 1];
                        return (
                            <a
                                key={`doc-${index}`}
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    window.open(FileApi.getFileDownloadUrl(docId), '_blank');
                                }}
                                className="text-blue-600 underline flex items-center gap-1 hover:text-opacity-80 transition-colors"
                            >
                                <FileText size={16} />
                                {part}
                            </a>
                        );
                    } else {
                        // This is regular text
                        return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
                    }
                })}
            </div>
        );
    };

    // Render file attachments if any
    const renderFileAttachments = () => {
        if (!files || files.length === 0) {
            return null;
        }

        return (
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="bg-muted/50 rounded-md px-3 py-2 flex items-center gap-2 text-sm"
                        >
                            <div className="flex items-center gap-1.5">
                                {getFileIcon(file.file_type)}
                                <span className="text-sm">{file.name}</span>
                            </div>
                            <a
                                href={FileApi.getFileDownloadUrl(file.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded flex items-center gap-1"
                                title="Скачать файл"
                            >
                                <Download size={12} />
                                Скачать
                            </a>
                            {file.preview_url && (
                                <a
                                    href={file.preview_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded flex items-center gap-1"
                                    title="Просмотреть"
                                >
                                    <ExternalLink size={12} />
                                    Просмотр
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReaction = (type: 'like' | 'dislike') => {
        if (onReaction) {
            // Pass the exact reaction type as expected by the parent component
            onReaction(id, type);
        }
    };

    // Render system message
    if (isSystem) {
        return (
            <div className="flex justify-center my-6">
                <div className="max-w-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-6 py-3 text-center">
                    <div className="text-amber-700 dark:text-amber-400 text-sm">{content}</div>
                </div>
            </div>
        );
    }

    // Render user or assistant message
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
            <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-4 ${
                    isUser
                        ? "chat-bubble-user animate-fade-in"
                        : "chat-bubble-assistant animate-slide-in"
                }`}
            >
                <div className="text-sm font-medium mb-2 flex justify-between items-center">
                    <span>{isUser ? "Вы" : "Ассистент"}</span>
                    <span className="text-xs opacity-70">{formatDate(new Date(created_at))}</span>
                </div>
                {renderMessageContent()}
                {renderFileAttachments()}

                {!isUser && (
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`p-1 h-auto ${hasLikeReaction ? 'text-green-600 dark:text-green-400' : ''}`}
                                onClick={() => handleReaction('like')}
                                title="Полезный ответ"
                            >
                                <ThumbsUp size={16} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`p-1 h-auto ${hasDislikeReaction ? 'text-red-600 dark:text-red-400' : ''}`}
                                onClick={() => handleReaction('dislike')}
                                title="Неполезный ответ"
                            >
                                <ThumbsDown size={16} />
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                            onClick={handleCopy}
                            title="Копировать сообщение"
                        >
                            {copied ? "Скопировано!" : <Copy size={16} />}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}