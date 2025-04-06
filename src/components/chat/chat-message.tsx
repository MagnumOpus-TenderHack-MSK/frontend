import React, { useState, useEffect, useRef } from "react";
import { ThumbsUp, ThumbsDown, Copy, FileText, FileImage, File, Download, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ChatMessage as ChatMessageType, MessageType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileApi } from "@/lib/file-api";
import { TypingAnimation } from "./typing-animation"; // Assuming TypingAnimation exists and works
import { MarkdownRenderer } from "./markdown-renderer";

interface MessageProps {
    message: ChatMessageType;
    onReaction?: (messageId: string, reaction: 'like' | 'dislike') => void;
    isTyping?: boolean; // Indicates if this specific assistant message is currently streaming
    typingContent?: string; // Used by TypingAnimation if isTyping is true
}

export function ChatMessage({ message, onReaction, isTyping = false, typingContent = "" }: MessageProps) {
    const { id, content, message_type, created_at, reactions, files, sources } = message;

    // Normalize message type for reliable comparisons
    const messageTypeLower = typeof message_type === 'string' ? message_type.toLowerCase() : '';

    const isUser = messageTypeLower === MessageType.USER;
    const isSystem = messageTypeLower === MessageType.SYSTEM;
    const isAssistant = messageTypeLower === MessageType.AI;

    const [copied, setCopied] = useState(false);
    const [animationComplete, setAnimationComplete] = useState(!isTyping); // Initial state based on prop

    // Update animation state based on prop changes
    useEffect(() => {
        setAnimationComplete(!isTyping);
    }, [isTyping]);

    // Reaction checks (simplified)
    const hasLikeReaction = reactions?.some(r => r.reaction_type?.toLowerCase() === 'like');
    const hasDislikeReaction = reactions?.some(r => r.reaction_type?.toLowerCase() === 'dislike');

    const getFileIcon = (fileType: string | undefined) => {
        const typeLower = fileType?.toLowerCase() ?? '';
        // ... (keep existing file icon logic)
        switch(typeLower) {
            case 'image': return <FileImage size={14} className="text-blue-500" />;
            case 'text': return <FileText size={14} className="text-green-500" />;
            case 'pdf': return <FileText size={14} className="text-red-500" />;
            case 'word': return <FileText size={14} className="text-blue-600" />;
            case 'excel': return <FileText size={14} className="text-green-600" />;
            default: return <File size={14} className="text-gray-500" />;
        }
    };

    const renderMessageContent = () => {
        // Use TypingAnimation only for the assistant message currently being streamed
        if (isAssistant && isTyping) {
            // Pass the dynamically updating typingContent
            // isCompleted should reflect the *final* state passed via props
            // onComplete callback likely handled within TypingAnimation or context now
            return (
                <TypingAnimation
                    content={typingContent || ""} // Use the streamed content
                    isCompleted={!isTyping} // Animation is done when the prop says so
                    onComplete={() => setAnimationComplete(true)} // Update local state if needed
                    speed={100} // Adjust speed
                />
            );
        }

        // Otherwise, render the final Markdown content
        // Ensure MarkdownRenderer doesn't also try to animate if isTyping is somehow true here
        return (
            <MarkdownRenderer
                content={content || ""}
                messageId={id.toString()} // Ensure string ID
                sources={sources}
                // Pass isTyping={false} or remove if MarkdownRenderer doesn't need it
            />
        );
    };

    const renderFileAttachments = () => {
        if (!files || files.length === 0) return null;
        return (
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                    {files.map((file) => {
                        if (!file || !file.id) return null;
                        const fileIdStr = file.id.toString(); // Ensure string ID
                        return (
                            <div key={fileIdStr} className="bg-muted/50 rounded-md px-3 py-2 flex items-center gap-2 text-sm">
                                {getFileIcon(file.file_type)}
                                <span className="text-sm truncate max-w-[150px]">{file.name || "Файл"}</span>
                                <a
                                    href={FileApi.getFileDownloadUrl(fileIdStr)}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded flex items-center gap-1 hover:opacity-80"
                                    title="Скачать файл"
                                > <Download size={12} /> Скачать </a>
                                {file.preview_url && (
                                    <a
                                        href={FileApi.getFilePreviewUrl(fileIdStr)}
                                        target="_blank" rel="noopener noreferrer"
                                        className="text-xs bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded flex items-center gap-1 hover:opacity-80"
                                        title="Просмотреть"
                                    > <ExternalLink size={12} /> Просмотр </a>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content || ""); // Copy final content
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReaction = (type: 'like' | 'dislike') => {
        if (onReaction) onReaction(id.toString(), type); // Ensure string ID
    };

    // --- System Message Rendering ---
    if (isSystem) {
        return (
            <div className="flex justify-center my-6 px-4">
                <div className="w-full max-w-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-6 py-3 text-center">
                    <div className="text-amber-700 dark:text-amber-400 text-sm">
                        <MarkdownRenderer content={content || ""} messageId={id.toString()} sources={sources} />
                    </div>
                </div>
            </div>
        );
    }

    // --- User/Assistant Message Rendering ---
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

                <div className="message-content-wrapper">
                    {renderMessageContent()}
                </div>

                {renderFileAttachments()}

                {/* Show actions only for completed AI messages */}
                {isAssistant && animationComplete && (
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex space-x-2">
                            <Button
                                variant="ghost" size="sm"
                                className={`p-1 h-auto ${hasLikeReaction ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => handleReaction('like')} title="Полезный ответ"
                            > <ThumbsUp size={16} /> </Button>
                            <Button
                                variant="ghost" size="sm"
                                className={`p-1 h-auto ${hasDislikeReaction ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => handleReaction('dislike')} title="Неполезный ответ"
                            > <ThumbsDown size={16} /> </Button>
                        </div>
                        <Button
                            variant="ghost" size="sm"
                            className="p-1 h-auto text-muted-foreground hover:text-foreground"
                            onClick={handleCopy} title="Копировать сообщение"
                        > {copied ? "Скопировано!" : <Copy size={16} />} </Button>
                    </div>
                )}
            </div>
        </div>
    );
}