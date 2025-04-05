import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatSuggestions } from '@/components/chat/chat-suggestions';
import { Chat, ChatMessage as ChatMessageType, MessageStatus } from '@/lib/types';
import { useWebSocket } from '@/contexts/websocket-context';

interface MessageManagerProps {
    currentChat: Chat | null;
    isLoadingChats: boolean;
    isTyping: boolean;
    pendingMessageId: string | null;
    streamedContent: string;
    onMessageReaction: (messageId: string, reaction: 'like' | 'dislike') => void;
    onSuggestionClick: (text: string) => void;
}

export const MessageManager: React.FC<MessageManagerProps> = ({
                                                                  currentChat,
                                                                  isLoadingChats,
                                                                  isTyping,
                                                                  pendingMessageId,
                                                                  streamedContent,
                                                                  onMessageReaction,
                                                                  onSuggestionClick
                                                              }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderedMessages, setRenderedMessages] = useState<ChatMessageType[]>([]);
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const lastScrollPositionRef = useRef<number>(0);
    const previousChatIdRef = useRef<string | null>(null);

    // Access lastCompletedMessage and checkForCompletedMessages from WebSocket context
    const { lastCompletedMessage, checkForCompletedMessages } = useWebSocket();

    // Deduplicate messages and add last completed message if needed
    const processMessages = useCallback((messages: ChatMessageType[] = []) => {
        const uniqueMessages = new Map<string, ChatMessageType>();

        // Process existing messages
        messages.forEach(message => {
            // Skip temporary messages if we have a real one with same content
            if (message.id.startsWith('temp-')) {
                const existingMessage = Array.from(uniqueMessages.values()).find(
                    m => !m.id.startsWith('temp-') &&
                        m.content === message.content &&
                        m.message_type.toLowerCase() === message.message_type.toLowerCase()
                );
                if (existingMessage) {
                    return;
                }
            }

            uniqueMessages.set(message.id, message);
        });

        // Add last completed message if it's not already in the messages
        if (lastCompletedMessage && !uniqueMessages.has(lastCompletedMessage.id)) {
            const completedMessageToAdd: ChatMessageType = {
                id: lastCompletedMessage.id,
                chat_id: currentChat?.id || '',
                content: lastCompletedMessage.content,
                message_type: 'ai',
                status: MessageStatus.COMPLETED,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                sources: [],
                files: [],
                reactions: []
            };

            uniqueMessages.set(lastCompletedMessage.id, completedMessageToAdd);
        }

        // Convert back to sorted array
        return Array.from(uniqueMessages.values())
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }, [currentChat?.id, lastCompletedMessage]);

    // Check for incomplete messages and force-complete them
    useEffect(() => {
        // Periodically check for completion
        const checkInterval = setInterval(() => {
            if (isTyping && pendingMessageId) {
                checkForCompletedMessages();
            }
        }, 5000);

        return () => clearInterval(checkInterval);
    }, [isTyping, pendingMessageId, checkForCompletedMessages]);

    // Update rendered messages when the current chat or last completed message changes
    useEffect(() => {
        if (currentChat?.messages) {
            const chatId = currentChat.id;

            // If switching to a different chat, always scroll to bottom
            if (previousChatIdRef.current !== chatId) {
                setShouldScrollToBottom(true);
                previousChatIdRef.current = chatId;
            }

            const processedMessages = processMessages(currentChat.messages);
            setRenderedMessages(processedMessages);
        } else {
            setRenderedMessages([]);
        }
    }, [currentChat, processMessages, lastCompletedMessage]);

    // Detect if user has scrolled up (to disable auto-scroll)
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;

            const container = containerRef.current;
            const scrollPosition = container.scrollTop;

            // Save last scroll position for reference
            lastScrollPositionRef.current = scrollPosition;

            // Calculate if we're near the bottom (within 200px)
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
            setIsNearBottom(isAtBottom);

            // Only update scroll behavior if there's a significant change
            if (isAtBottom !== shouldScrollToBottom) {
                setShouldScrollToBottom(isAtBottom);
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [shouldScrollToBottom]);

    // Scroll to bottom when messages change or new content arrives if appropriate
    useEffect(() => {
        if ((shouldScrollToBottom || isTyping) && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [renderedMessages, isTyping, streamedContent, shouldScrollToBottom]);

    // Always scroll to bottom when typing begins
    useEffect(() => {
        if (isTyping && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isTyping]);

    // Add scroll button when user has scrolled up
    const handleScrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            setShouldScrollToBottom(true);
        }
    };

    if (isLoadingChats) {
        return (
            <div className="flex-1 flex justify-center items-center h-full">
                <div className="animate-pulse text-center">
                    <div className="h-6 w-32 bg-muted rounded mx-auto"></div>
                    <div className="mt-2 h-4 w-48 bg-muted rounded mx-auto"></div>
                </div>
            </div>
        );
    }

    if (!currentChat || !renderedMessages || renderedMessages.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto flex items-center justify-center p-4" ref={containerRef}>
                <ChatSuggestions onSuggestionClick={onSuggestionClick} />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative" ref={containerRef}>
            {renderedMessages.map((message) => (
                <ChatMessage
                    key={message.id}
                    message={message}
                    onReaction={onMessageReaction}
                />
            ))}

            {/* Render typing message separately */}
            {isTyping && pendingMessageId && (
                <ChatMessage
                    key={`typing-${pendingMessageId}`}
                    message={{
                        id: pendingMessageId,
                        chat_id: currentChat.id,
                        content: streamedContent || "",
                        message_type: 'ai',
                        status: MessageStatus.PROCESSING,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }}
                    isTyping={true}
                    typingContent={streamedContent}
                />
            )}

            {/* Scroll to bottom button - only show when not near bottom */}
            {!isNearBottom && (
                <button
                    onClick={handleScrollToBottom}
                    className="fixed bottom-24 right-6 bg-primary text-white rounded-full p-3 shadow-lg hover:bg-primary/90 transition-opacity opacity-80 hover:opacity-100"
                    aria-label="Scroll to bottom"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageManager;