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
                                                                  onSuggestionClick,
                                                              }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderedMessages, setRenderedMessages] = useState<ChatMessageType[]>([]);
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const lastScrollPositionRef = useRef<number>(0);
    const previousChatIdRef = useRef<string | null>(null);

    // Access checkForCompletedMessages from WebSocket context
    const { checkForCompletedMessages } = useWebSocket();

    // Deduplicate messages based on their IDs and content (Ensure this matches ChatAppContent)
    const deduplicateAndSortMessages = useCallback((messages: ChatMessageType[] = []) => {
        const uniqueMessages = new Map<string, ChatMessageType>();
        messages.forEach(newMessage => {
            const existingMessage = uniqueMessages.get(newMessage.id);

            if (!existingMessage) {
                // If no message with this ID exists, add the new one
                uniqueMessages.set(newMessage.id, newMessage);
            } else {
                // If a message with this ID exists...
                // Only replace the existing message if the new message is NOT temporary.
                // This ensures a 'real' message always overwrites a 'temporary' one.
                if (!newMessage.id.startsWith('temp-')) {
                     uniqueMessages.set(newMessage.id, newMessage);
                }
                // If newMessage IS temporary, we implicitly keep the existing one.
            }
        });
        return Array.from(uniqueMessages.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }, []);

    // Periodically check for incomplete messages and force completion if needed
    useEffect(() => {
        const checkInterval = setInterval(() => {
            if (isTyping && pendingMessageId) {
                checkForCompletedMessages();
            }
        }, 5000);
        return () => clearInterval(checkInterval);
    }, [isTyping, pendingMessageId, checkForCompletedMessages]);

    // Update rendered messages when currentChat changes
    useEffect(() => {
        if (currentChat?.messages) {
            const chatId = currentChat.id;

            // Check if we switched to a new chat
            if (previousChatIdRef.current !== chatId) {
                setShouldScrollToBottom(true);
                previousChatIdRef.current = chatId;
            }

            // Process and deduplicate messages using the unified function
            const deduped = deduplicateAndSortMessages(currentChat.messages);
            setRenderedMessages(deduped);
        } else {
            // Critical fix: ensure we reset messages when no currentChat
            setRenderedMessages([]);
        }
    }, [currentChat, deduplicateAndSortMessages]);

    // Detect scroll events to update "near bottom" status
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const container = containerRef.current;
            lastScrollPositionRef.current = container.scrollTop;
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
            setIsNearBottom(isAtBottom);

            // Only update scroll behavior if it changed
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

    // Scroll to bottom when messages update or new content arrives
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

    const handleScrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            setShouldScrollToBottom(true);
        }
    };

    // Critical fix: Only render suggestions if there are no messages (empty chat)
    // This differentiation ensures we don't show messages from other chats
    const isEmptyChat = !currentChat || (!renderedMessages.length && !pendingMessageId && !isTyping);

    // If we have a currentChat but no messages are loaded yet, show a loading state
    if (currentChat && isLoadingChats && !renderedMessages.length && !pendingMessageId) {
        return (
            <div className="flex-1 overflow-y-auto flex items-center justify-center p-4" ref={containerRef}>
                <div className="animate-pulse text-center">
                    <div className="h-6 w-32 bg-muted rounded mx-auto mb-4"></div>
                    <div className="h-4 w-48 bg-muted rounded mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative" ref={containerRef}>
            {/* Render the chat suggestions only if it's an empty chat */}
            {isEmptyChat && (
                <ChatSuggestions onSuggestionClick={onSuggestionClick} />
            )}

            {/* Only render messages if we have a current chat and messages */}
            {currentChat && renderedMessages.map((message) => (
                <ChatMessage
                    key={message.id}
                    message={message}
                    onReaction={onMessageReaction}
                    isTyping={false} // Normal messages are not typing
                />
            ))}

            {/* Render the pending message ONLY if it's actively typing AND not already in renderedMessages */}
            {isTyping && pendingMessageId && !renderedMessages.some(msg => msg.id === pendingMessageId) && (
                <ChatMessage
                    key={`pending-${pendingMessageId}`}
                    message={{
                        id: pendingMessageId,
                        chat_id: currentChat!.id,
                        content: streamedContent || "",
                        message_type: 'ai',
                        status: MessageStatus.PROCESSING,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }}
                    isTyping={isTyping}
                    typingContent={streamedContent}
                    onReaction={onMessageReaction}
                />
            )}

            {/* Show a "scroll to bottom" button if the user has scrolled up */}
            {!isNearBottom && (
                <button
                    onClick={handleScrollToBottom}
                    className="fixed bottom-24 right-6 bg-primary text-white rounded-full p-3 shadow-lg hover:bg-primary/90 transition-opacity opacity-80 hover:opacity-100"
                    aria-label="Scroll to bottom"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageManager;