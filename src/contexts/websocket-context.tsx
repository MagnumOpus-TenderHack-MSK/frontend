import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { WebSocketService } from '@/lib/websocket-service';
import { WebSocketMessage, MessageChunk, MessageComplete, MessageSuggestion } from '@/lib/types';

interface WebSocketContextType {
    connectWebSocket: (chatId: string, isNewChat?: boolean) => void;
    disconnectWebSocket: () => void;
    isConnected: boolean;
    isTyping: boolean;
    pendingMessageId: string | null;
    streamedContent: string;
    chatSuggestions: MessageSuggestion[];
    lastCompletedMessage: {
        id: string;
        content: string;
        sources?: any[];
    } | null;
    chatNameUpdate: string | null;
    addMessageListener: (listener: (message: WebSocketMessage) => void) => void;
    removeMessageListener: (listener: (message: WebSocketMessage) => void) => void;
    checkForCompletedMessages: () => void;
    clearSuggestions: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
    const [streamedContent, setStreamedContent] = useState('');
    const [chatSuggestions, setChatSuggestions] = useState<MessageSuggestion[]>([]);
    const [chatNameUpdate, setChatNameUpdate] = useState<string | null>(null);
    const [lastCompletedMessage, setLastCompletedMessage] = useState<{
        id: string;
        content: string;
        sources?: any[];
    } | null>(null);

    const webSocketRef = useRef<WebSocketService | null>(null);
    const messageListenersRef = useRef<Array<(message: WebSocketMessage) => void>>([]);
    const messageChunksRef = useRef<Record<string, string>>({});
    const completedMessagesRef = useRef<Set<string>>(new Set());
    const processedChunksRef = useRef<Set<string>>(new Set());
    const chunkCountRef = useRef<Record<string, number>>({});
    const lastChunkTimeRef = useRef<Record<string, number>>({});
    const animationInProgressRef = useRef<boolean>(false);
    const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const forceCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messageCompletionCheckerRef = useRef<NodeJS.Timeout | null>(null);
    const currentChatIdRef = useRef<string | null>(null);
    const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Restore last completed message on mount
    useEffect(() => {
        try {
            const storedMessage = localStorage.getItem('last-completed-message');
            if (storedMessage) {
                const parsedMessage = JSON.parse(storedMessage);
                setLastCompletedMessage(parsedMessage);
            }
        } catch (error) {
            console.error('Failed to restore last completed message:', error);
        }
    }, []);

    // Clear suggestions method
    const clearSuggestions = useCallback(() => {
        setChatSuggestions([]);
    }, []);

    const handleMessageComplete = useCallback((message: MessageComplete) => {
        const { message_id, sources, suggestions, chat_name } = message;
        console.log("Message complete for message ID:", message_id);

        // Clear any pending timeouts
        if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = null;
        }

        if (forceCompleteTimeoutRef.current) {
            clearTimeout(forceCompleteTimeoutRef.current);
            forceCompleteTimeoutRef.current = null;
        }

        // Mark message as completed
        completedMessagesRef.current.add(message_id);

        // Ensure we have the complete message content
        const completeContent = messageChunksRef.current[message_id] || '';

        // If we received a chat name update, store it
        if (chat_name) {
            setChatNameUpdate(chat_name);
        }

        // Update last completed message state and localStorage
        const completedMessage = {
            id: message_id,
            content: completeContent,
            sources: sources || []
        };

        try {
            localStorage.setItem('last-completed-message', JSON.stringify(completedMessage));
        } catch (error) {
            console.error('Failed to save last completed message:', error);
        }

        setLastCompletedMessage(completedMessage);

        // Handle suggestions if provided
        if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
            console.log("Received suggestions in completion:", suggestions);

            // Transform suggestions into the expected format
            const formattedSuggestions = suggestions.map((text, index) => ({
                id: `suggestion-${Date.now()}-${index}`,
                text,
                icon: getIconForSuggestion(text)
            }));

            setChatSuggestions(formattedSuggestions);

            // Set a timeout to clear suggestions after 30 minutes
            if (suggestionsTimeoutRef.current) {
                clearTimeout(suggestionsTimeoutRef.current);
            }

            suggestionsTimeoutRef.current = setTimeout(() => {
                setChatSuggestions([]);
            }, 30 * 60 * 1000); // 30 minutes
        }

        // Only update UI if this is the currently pending message
        if (pendingMessageId === message_id) {
            // Set final content - ensure we have the complete message
            setStreamedContent(completeContent);
            setIsTyping(false);
            setPendingMessageId(null);
        }
    }, [pendingMessageId]);

    // Function to determine icon for a suggestion
    function getIconForSuggestion(text: string): string {
        const textLower = text.toLowerCase();

        if (textLower.includes('регистрац') || textLower.includes('аккаунт')) {
            return 'user-plus';
        } else if (textLower.includes('поиск') || textLower.includes('найти')) {
            return 'search';
        } else if (textLower.includes('что такое') || textLower.includes('как ') || textLower.includes('почему')) {
            return 'help-circle';
        } else if (textLower.includes('документ') || textLower.includes('файл') || textLower.includes('подать')) {
            return 'file-text';
        } else if (textLower.includes('ошибк') || textLower.includes('проблем') || textLower.includes('не работает')) {
            return 'alert-triangle';
        }

        return 'message-square';
    }

    // Periodically check for messages that appear to be complete
    const checkForCompletedMessages = useCallback(() => {
        const now = Date.now();

        // Only check if we have a pending message that's been receiving chunks
        if (pendingMessageId && lastChunkTimeRef.current[pendingMessageId]) {
            const lastChunkTime = lastChunkTimeRef.current[pendingMessageId];
            const elapsed = now - lastChunkTime;

            // If it's been more than 5 seconds since the last chunk and we have content
            if (elapsed > 5000 && messageChunksRef.current[pendingMessageId]) {
                console.log(`No new chunks for ${elapsed}ms, considering message ${pendingMessageId} complete`);
                handleMessageComplete({
                    type: "complete",
                    message_id: pendingMessageId,
                    suggestions: [], // Empty array as we're forcing completion
                });
            }
        }
    }, [pendingMessageId, handleMessageComplete]);

    // Handle message chunks with robust duplication detection
    const handleMessageChunk = useCallback((message: MessageChunk) => {
        const { message_id, content, suggestions, chat_name } = message;

        // Handle chat name update if provided in a chunk
        if (chat_name) {
            setChatNameUpdate(chat_name);
            console.log("Received chat name update:", chat_name);
        }

        // Handle suggestions if provided in a chunk
        if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
            console.log("Received suggestions in chunk:", suggestions);

            // Transform suggestions into the expected format
            const formattedSuggestions = suggestions.map((text, index) => ({
                id: `suggestion-${Date.now()}-${index}`,
                text,
                icon: getIconForSuggestion(text)
            }));

            setChatSuggestions(formattedSuggestions);

            // Set a timeout to clear suggestions after 30 minutes
            if (suggestionsTimeoutRef.current) {
                clearTimeout(suggestionsTimeoutRef.current);
            }

            suggestionsTimeoutRef.current = setTimeout(() => {
                setChatSuggestions([]);
            }, 30 * 60 * 1000); // 30 minutes
        }

        // Check if message was already marked as complete
        if (completedMessagesRef.current.has(message_id)) {
            console.log("Ignoring chunk for already completed message:", message_id);
            return;
        }

        // Track chunk count for this message
        if (!chunkCountRef.current[message_id]) {
            chunkCountRef.current[message_id] = 0;
        }
        chunkCountRef.current[message_id]++;

        // Update last activity time
        lastChunkTimeRef.current[message_id] = Date.now();

        // Generate a simple hash for duplicate detection
        const contentHash = `${message_id}:${content}`;

        // Only consider it a duplicate if we've seen this exact content very recently (within same session)
        if (processedChunksRef.current.has(contentHash)) {
            console.log(`Skipping duplicate chunk: ${contentHash.substring(0, 50)}...`);
            return;
        }

        // Mark this chunk as processed
        processedChunksRef.current.add(contentHash);
        console.log(`Handling message chunk #${chunkCountRef.current[message_id]} for message ${message_id}`);

        // Update accumulated content for this message
        if (!messageChunksRef.current[message_id]) {
            messageChunksRef.current[message_id] = content;
        } else {
            messageChunksRef.current[message_id] += content;
        }

        // Update UI state - show typing animation
        if (pendingMessageId !== message_id) {
            setIsTyping(true);
            setPendingMessageId(message_id);
            animationInProgressRef.current = true;
        }

        // Always update content
        setStreamedContent(messageChunksRef.current[message_id]);

        // Reset completion timeout whenever we get a new chunk
        if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
        }

        // Set a safety timeout that will force-complete if no more chunks or complete message
        // is received within a reasonable time (15 seconds)
        completionTimeoutRef.current = setTimeout(() => {
            if (pendingMessageId === message_id && isTyping) {
                console.log(`No complete message received for ${message_id}, forcing completion`);
                handleMessageComplete({ type: "complete", message_id });
            }
        }, 15000);

        // Also set a much longer timeout (1 minute) for force complete in case of server issues
        if (!forceCompleteTimeoutRef.current) {
            forceCompleteTimeoutRef.current = setTimeout(() => {
                if (pendingMessageId && isTyping) {
                    console.log(`Force completing message ${pendingMessageId} after long timeout`);
                    handleMessageComplete({ type: "complete", message_id: pendingMessageId });
                }
            }, 60000); // 1 minute absolute maximum
        }
    }, [pendingMessageId, isTyping, handleMessageComplete]);

    // Handle WebSocket messages
    const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
        if (!message.type) {
            console.warn("Received message without type:", message);
            return;
        }

        // Notify all registered listeners
        messageListenersRef.current.forEach(listener => {
            try {
                listener(message);
            } catch (error) {
                console.error("Error in message listener:", error);
            }
        });

        // Handle specific message types
        if (message.type === "chunk") {
            const chunkMessage = message as MessageChunk;
            handleMessageChunk(chunkMessage);
        } else if (message.type === "complete") {
            const completeMessage = message as MessageComplete;
            handleMessageComplete(completeMessage);
        } else if (message.type === "stream_content") {
            if (message.content && message.message_id) {
                handleMessageChunk({
                    type: "chunk",
                    message_id: message.message_id,
                    content: message.content,
                    suggestions: message.suggestions, // Pass suggestions if available
                    chat_name: message.chat_name, // Pass chat name if available
                });
            }
        } else if (message.type === "suggestions") {
            // Handle suggestions sent from server directly
            if (message.suggestions && Array.isArray(message.suggestions)) {
                console.log("Received direct suggestions:", message.suggestions);

                // Transform to our format
                const formattedSuggestions = message.suggestions.map((text, index) => ({
                    id: `suggestion-${Date.now()}-${index}`,
                    text,
                    icon: getIconForSuggestion(text)
                }));

                setChatSuggestions(formattedSuggestions);
            }
        } else if (message.type === "connection_established") {
            // Check if there are initial suggestions provided with connection message
            if (message.suggestions && Array.isArray(message.suggestions)) {
                console.log("Received initial suggestions on connection:", message.suggestions);

                // Transform to our format
                const formattedSuggestions = message.suggestions.map((text, index) => ({
                    id: `suggestion-${Date.now()}-${index}`,
                    text,
                    icon: getIconForSuggestion(text)
                }));

                setChatSuggestions(formattedSuggestions);
            }
        }
    }, [handleMessageChunk, handleMessageComplete]);

    const connectWebSocket = useCallback((chatId: string, isNewChat: boolean = false) => {
        // Disconnect existing connection if any
        if (webSocketRef.current) {
            webSocketRef.current.disconnect();
            webSocketRef.current = null;
        }

        // Save current chat ID
        currentChatIdRef.current = chatId;

        // Reset states based on whether this is a new chat or not
        setIsTyping(false);
        setPendingMessageId(null);
        setStreamedContent('');
        setChatNameUpdate(null);

        // Only clear suggestions when switching to an existing chat, not a new one
        if (!isNewChat) {
            setChatSuggestions([]);
        }

        // Clean up message processing data
        // Keep message chunks only from this chat
        const currentChunks: Record<string, string> = {};
        Object.keys(messageChunksRef.current).forEach(key => {
            if (key.includes(chatId)) {
                currentChunks[key] = messageChunksRef.current[key];
            }
        });
        messageChunksRef.current = currentChunks;

        // Reset tracking
        completedMessagesRef.current.clear();
        processedChunksRef.current.clear();
        chunkCountRef.current = {};
        lastChunkTimeRef.current = {};
        animationInProgressRef.current = false;

        // Clear timeouts
        if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = null;
        }

        if (forceCompleteTimeoutRef.current) {
            clearTimeout(forceCompleteTimeoutRef.current);
            forceCompleteTimeoutRef.current = null;
        }

        // Only clear suggestions timeout for existing chats
        if (!isNewChat && suggestionsTimeoutRef.current) {
            clearTimeout(suggestionsTimeoutRef.current);
            suggestionsTimeoutRef.current = null;
        }

        const token = localStorage.getItem('jwt_token');
        if (!token) {
            console.error("No token found for WebSocket connection");
            return;
        }

        try {
            const ws = new WebSocketService(chatId, token);
            ws.setNewChatFlag(isNewChat);

            // Set up event handlers
            ws.addMessageListener(handleWebSocketMessage);

            ws.addConnectionListener(() => {
                console.log("WebSocket connected successfully");
                setIsConnected(true);
            });

            ws.addErrorListener((error) => {
                console.error("WebSocket error:", error);
                setIsConnected(false);
            });

            console.log(`Initiating WebSocket connection (new chat: ${isNewChat})`);
            ws.connect();
            webSocketRef.current = ws;

            // Start message completion checker
            messageCompletionCheckerRef.current = setInterval(checkForCompletedMessages, 3000);
        } catch (error) {
            console.error("Error creating WebSocket connection:", error);
        }
    }, [handleWebSocketMessage, checkForCompletedMessages]);

    const disconnectWebSocket = useCallback(() => {
        if (webSocketRef.current) {
            webSocketRef.current.disconnect();
            webSocketRef.current = null;
            setIsConnected(false);
            setIsTyping(false);
            setPendingMessageId(null);

            // Don't clear these states as they might be needed for UI updates
            // setLastCompletedMessage(null);
            setChatNameUpdate(null);

            // Don't clear suggestions here - they'll be managed in connectWebSocket
            // setChatSuggestions([]);

            // Don't clear streamedContent so it remains visible in the UI
            currentChatIdRef.current = null;

            // Clear all timeouts and intervals
            if (completionTimeoutRef.current) {
                clearTimeout(completionTimeoutRef.current);
                completionTimeoutRef.current = null;
            }

            if (forceCompleteTimeoutRef.current) {
                clearTimeout(forceCompleteTimeoutRef.current);
                forceCompleteTimeoutRef.current = null;
            }

            if (messageCompletionCheckerRef.current) {
                clearInterval(messageCompletionCheckerRef.current);
                messageCompletionCheckerRef.current = null;
            }

            // Don't clear suggestions timeout - keep suggestions between reconnects
            // if (suggestionsTimeoutRef.current) {
            //     clearTimeout(suggestionsTimeoutRef.current);
            //     suggestionsTimeoutRef.current = null;
            // }
        }
    }, []);

    const addMessageListener = useCallback((listener: (message: WebSocketMessage) => void) => {
        messageListenersRef.current.push(listener);
    }, []);

    const removeMessageListener = useCallback((listener: (message: WebSocketMessage) => void) => {
        messageListenersRef.current = messageListenersRef.current.filter(l => l !== listener);
    }, []);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            disconnectWebSocket();

            // Ensure all timeouts are cleared
            if (completionTimeoutRef.current) {
                clearTimeout(completionTimeoutRef.current);
            }

            if (forceCompleteTimeoutRef.current) {
                clearTimeout(forceCompleteTimeoutRef.current);
            }

            if (messageCompletionCheckerRef.current) {
                clearInterval(messageCompletionCheckerRef.current);
            }

            if (suggestionsTimeoutRef.current) {
                clearTimeout(suggestionsTimeoutRef.current);
            }

            // Clean up memory
            processedChunksRef.current.clear();
            completedMessagesRef.current.clear();
            lastChunkTimeRef.current = {};
            chunkCountRef.current = {};
        };
    }, [disconnectWebSocket]);

    const value = {
        connectWebSocket,
        disconnectWebSocket,
        isConnected,
        isTyping,
        pendingMessageId,
        streamedContent,
        chatSuggestions,
        lastCompletedMessage,
        chatNameUpdate,
        addMessageListener,
        removeMessageListener,
        checkForCompletedMessages,
        clearSuggestions
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};