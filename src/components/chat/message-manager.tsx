import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatSuggestions } from '@/components/chat/chat-suggestions';
import TypingLoader from '@/components/chat/typing-loader'; // Use the loader component
import { Chat, ChatMessage as ChatMessageType, MessageStatus } from '@/lib/types';
import { useWebSocket } from '@/contexts/websocket-context';
import { ArrowDownCircle } from 'lucide-react'; // Icon for scroll button

interface MessageManagerProps {
    currentChat: Chat | null;
    isLoadingChats: boolean; // Loading chat list or initial messages
    isTyping: boolean; // Actively receiving chunks
    expectingAiResponse: boolean; // Waiting for the first chunk
    pendingMessageId: string | null;
    streamedContent: string;
    onMessageReaction: (messageId: string, reaction: 'like' | 'dislike') => void;
    onSuggestionClick: (text: string) => void;
}

export const MessageManager: React.FC<MessageManagerProps> = ({
                                                                  currentChat,
                                                                  isLoadingChats,
                                                                  isTyping,
                                                                  expectingAiResponse, // Receive the new state
                                                                  pendingMessageId,
                                                                  streamedContent,
                                                                  onMessageReaction,
                                                                  onSuggestionClick,
                                                              }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderedMessages, setRenderedMessages] = useState<ChatMessageType[]>([]);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [userScrolledUp, setUserScrolledUp] = useState(false); // Track if user initiated scroll up
    const previousChatIdRef = useRef<string | null>(null);

    // Access message completion checker from context (if still needed)
    const { checkForCompletedMessages } = useWebSocket();

    // Shared message deduplication and sorting logic
    const deduplicateAndSortMessages = useCallback((messages: ChatMessageType[] = []) => {
        const uniqueMessages = new Map<string, ChatMessageType>();
        messages.forEach(newMessage => {
            const existingMessage = uniqueMessages.get(newMessage.id);
            if (!existingMessage || !newMessage.id.startsWith('temp-') || (newMessage.content && newMessage.content !== existingMessage.content)) {
                uniqueMessages.set(newMessage.id, newMessage);
            } else if (!uniqueMessages.has(newMessage.id)) {
                uniqueMessages.set(newMessage.id, existingMessage);
            }
        });
        return Array.from(uniqueMessages.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }, []);

    // Update rendered messages when the current chat's messages change
    useEffect(() => {
        if (currentChat) {
            const chatId = currentChat.id;
            // Reset scroll behavior when switching chats
            if (previousChatIdRef.current !== chatId) {
                setUserScrolledUp(false); // Reset user scroll state on chat change
                previousChatIdRef.current = chatId;
                // Force scroll to bottom when switching to a new chat
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); // Use 'auto' for instant scroll on chat switch
                    setIsNearBottom(true);
                }, 0);
            }
            const deduped = deduplicateAndSortMessages(currentChat.messages);
            setRenderedMessages(deduped);
        } else {
            setRenderedMessages([]);
            previousChatIdRef.current = null;
            setUserScrolledUp(false); // Reset on no chat
        }
    }, [currentChat, deduplicateAndSortMessages]); // Dependency: currentChat object

    // Handle scrolling behavior
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        let scrollTimeout: NodeJS.Timeout | null = null;

        const handleScroll = () => {
            // Debounce scroll checks slightly
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollThreshold = 200; // Pixels from bottom
                const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;
                setIsNearBottom(atBottom);
                // Detect if user explicitly scrolled up
                if (!atBottom && container.scrollTop < container.scrollHeight - container.clientHeight - scrollThreshold * 1.5) {
                    setUserScrolledUp(true);
                } else if (atBottom) {
                    setUserScrolledUp(false); // Reset if user scrolls back down
                }
            }, 100); // Debounce time
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        // Initial check
        handleScroll();

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeout) clearTimeout(scrollTimeout);
        };
    }, []); // No dependency needed here?

    // Auto-scroll logic
    useEffect(() => {
        // Auto-scroll if the user hasn't scrolled up OR if the AI just started typing/expecting
        const shouldAutoScroll = !userScrolledUp || isTyping || expectingAiResponse;

        if (shouldAutoScroll && messagesEndRef.current) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            });
        }
    }, [renderedMessages, isTyping, expectingAiResponse, userScrolledUp]); // Dependencies

    // Manual scroll to bottom button handler
    const handleScrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            setUserScrolledUp(false); // Allow auto-scroll again
        }
    };

    // Determine if the chat is effectively empty (for showing suggestions)
    const isEmptyChat = !currentChat || (!renderedMessages.length && !pendingMessageId && !isTyping && !expectingAiResponse);

    // Show loading skeleton if chat list/initial messages are loading
    if (isLoadingChats && !currentChat) {
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
        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative scroll-smooth" ref={containerRef}>

            {/* Render initial suggestions only if the chat is truly empty */}
            {isEmptyChat && (
                <ChatSuggestions onSuggestionClick={onSuggestionClick} />
            )}

            {/* Render existing messages */}
            {renderedMessages.map((message) => {
                // Determine if this message is the one currently being typed
                const isCurrentlyTypingMessage = isTyping && message.id === pendingMessageId;

                return (
                    <ChatMessage
                        key={message.id}
                        message={message}
                        onReaction={onMessageReaction}
                        // Pass isTyping=true ONLY for the specific message being streamed
                        isTyping={isCurrentlyTypingMessage}
                        // Pass streamedContent only to the message being typed
                        typingContent={isCurrentlyTypingMessage ? streamedContent : ""}
                    />
                );
            })}

            {/* Render Typing Loader only when expecting response and not yet typing */}
            {expectingAiResponse && !isTyping && !pendingMessageId && (
                <TypingLoader />
            )}

            {/* Scroll to bottom button (Show when user has scrolled up) */}
            {userScrolledUp && !isNearBottom && (
                <button
                    onClick={handleScrollToBottom}
                    className="fixed bottom-24 right-6 z-10 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-opacity duration-300 opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 animate-bounce" // Added bounce animation
                    aria-label="Scroll to bottom"
                    title="К последним сообщениям"
                >
                    <ArrowDownCircle size={24} /> {/* Larger icon */}
                </button>
            )}

            {/* Anchor element to scroll to */}
            <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>
    );
};

export default MessageManager;