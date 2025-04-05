"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ThumbsUp, ThumbsDown, Copy, FileText, FileImage, File, Download, ExternalLink } from "lucide-react";
import { extractDocumentReferences } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { ChatMessage as ChatMessageType, MessageType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileApi } from "@/lib/file-api";
import { TypingAnimation } from "./typing-animation";
import { MarkdownRenderer } from "./markdown-renderer";

interface MessageProps {
    message: ChatMessageType;
    onReaction?: (messageId: string, reaction: 'like' | 'dislike') => void;
    isTyping?: boolean;
    typingContent?: string;
}

export function ChatMessage({ message, onReaction, isTyping = false, typingContent = "" }: MessageProps) {
    const { id, content, message_type, created_at, reactions, files } = message;

    // Make case-insensitive comparisons for consistent behavior
    const messageTypeLower = typeof message_type === 'string' ? message_type.toLowerCase() : '';

    // Determine message type consistently
    const isUser = messageTypeLower === 'user';
    const isSystem = messageTypeLower === 'system';
    const isAssistant = messageTypeLower === 'ai';

    const [copied, setCopied] = useState(false);
    const [animationComplete, setAnimationComplete] = useState(!isTyping);
    const processedContentRef = useRef<string | null>(null);
    const [lastTypingStatus, setLastTypingStatus] = useState(isTyping);
    const messageContentRef = useRef<string>(content || "");
    const typingContentRef = useRef<string>(typingContent || "");

    // When typing status changes, update our tracking state
    useEffect(() => {
        if (lastTypingStatus && !isTyping) {
            // Was typing, now stopped - consider animation complete
            setAnimationComplete(true);
        }
        setLastTypingStatus(isTyping);
    }, [isTyping, lastTypingStatus]);

    // Update content references when props change
    useEffect(() => {
        messageContentRef.current = content || "";
        if (typingContent && typingContent !== typingContentRef.current) {
            typingContentRef.current = typingContent;
            // Clear processed content cache when typing content changes
            processedContentRef.current = null;
        }
    }, [content, typingContent]);

    // Check if message has a reaction (case-insensitive)
    const hasLikeReaction = reactions?.some(r => {
        const reactionType = typeof r.reaction_type === 'string' ? r.reaction_type.toLowerCase() : '';
        return reactionType === 'like';
    });

    const hasDislikeReaction = reactions?.some(r => {
        const reactionType = typeof r.reaction_type === 'string' ? r.reaction_type.toLowerCase() : '';
        return reactionType === 'dislike';
    });

    // Get file icon based on type
    const getFileIcon = (fileType: string) => {
        const fileTypeLower = typeof fileType === 'string' ? fileType.toLowerCase() : '';

        switch(fileTypeLower) {
            case 'image':
                return <FileImage size={14} className="text-blue-500" />;
            case 'text':
                return <FileText size={14} className="text-green-500" />;
            case 'pdf':
                return <FileText size={14} className="text-red-500" />;
            case 'word':
                return <FileText size={14} className="text-blue-600" />;
            case 'excel':
                return <FileText size={14} className="text-green-600" />;
            default:
                return <File size={14} className="text-gray-500" />;
        }
    };

    // Process document references to replace with links
    const processDocumentReferences = useCallback((content: string) => {
        if (!content || !content.includes("[doc:")) return content;

        // If already processed, return from cache
        if (processedContentRef.current) {
            return processedContentRef.current;
        }

        const docRefs = extractDocumentReferences(content);
        let processedContent = content;

        // Replace document references with markdown links
        docRefs.forEach(ref => {
            const pattern = `\\[doc:${ref.id}\\]\\(${ref.text}\\)`;
            const regex = new RegExp(pattern, 'g');
            processedContent = processedContent.replace(
                regex,
                `[📄 ${ref.text}](${FileApi.getFileDownloadUrl(ref.id)})`
            );
        });

        // Cache the processed content
        processedContentRef.current = processedContent;
        return processedContent;
    }, []);

    // Determine content for rendering
    const contentToRender = useCallback(() => {
        // If typing, use typing content if available, otherwise use message content
        const baseContent = isTyping ? (typingContent || content) : content;

        // If no content, return empty string
        if (!baseContent) return "";

        return processDocumentReferences(baseContent);
    }, [isTyping, typingContent, content, processDocumentReferences]);

    // Render message content, handling typing state and markdown
    const renderMessageContent = () => {
        // If this message is currently being typed
        if (isTyping) {
            return (
                <TypingAnimation
                    content={contentToRender()}
                    isCompleted={!isTyping}
                    onComplete={() => setAnimationComplete(true)}
                    speed={80} // Faster typing speed
                />
            );
        }

        return <MarkdownRenderer content={contentToRender()} />;
    };

    // Render file attachments if any
    const renderFileAttachments = () => {
        if (!files || files.length === 0) {
            return null;
        }

        return (
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                    {files.map((file) => {
                        // Double-check that the file has the required properties
                        if (!file || !file.id) {
                            console.warn('Invalid file reference:', file);
                            return null;
                        }

                        return (
                            <div
                                key={file.id}
                                className="bg-muted/50 rounded-md px-3 py-2 flex items-center gap-2 text-sm"
                            >
                                <div className="flex items-center gap-1.5">
                                    {getFileIcon(file.file_type)}
                                    <span className="text-sm">{file.name || "File"}</span>
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
                                        href={FileApi.getFilePreviewUrl(file.id)}
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
                        );
                    })}
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
            onReaction(id, type);
        }
    };

    // Render system message with improved styling
    if (isSystem) {
        return (
            <div className="flex justify-center my-6 px-4">
                <div className="w-full max-w-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-6 py-3 text-center">
                    <div className="text-amber-700 dark:text-amber-400 text-sm">
                        <MarkdownRenderer content={content} />
                    </div>
                </div>
            </div>
        );
    }

    // Render user or assistant message
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 px-4`}>
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

                {/* Message content with improved animation handling */}
                <div className="message-content-wrapper">
                    {renderMessageContent()}
                </div>

                {renderFileAttachments()}

                {/* Only show reactions for AI messages and when typing is complete */}
                {isAssistant && (!isTyping || animationComplete) && (
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