// src/contexts/websocket-context.tsx
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { WebSocketService, WebSocketState } from '@/lib/websocket-service';
import { WebSocketMessage, MessageChunk, MessageComplete, MessageSuggestion, Source, MessageType } from '@/lib/types';

interface WebSocketContextType {
    connectWebSocket: (chatId: string, isNewChat?: boolean) => Promise<boolean>;
    disconnectWebSocket: () => void;
    isConnected: boolean;
    connectionState: WebSocketState; // Make non-nullable, default to CLOSED
    isTyping: boolean;
    expectingAiResponse: boolean;
    pendingMessageId: string | null;
    streamedContent: string;
    chatSuggestions: MessageSuggestion[];
    lastCompletedMessage: {
        id: string;
        content: string;
        sources?: Source[];
    } | null;
    chatNameUpdate: string | null;
    addMessageListener: (listener: (message: WebSocketMessage) => void) => void;
    removeMessageListener: (listener: (message: WebSocketMessage) => void) => void;
    // checkForCompletedMessages might be less necessary with improved service logic
    clearSuggestions: () => void;
    clearLastCompletedMessage: () => void;
    clearChatNameUpdate: () => void;
    startExpectingAiResponse: (messageId: string) => void;
    lastConnectionError: { code?: number; reason?: string; error?: Error } | null; // Store more error context
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// --- Helper Function ---
function getIconForSuggestion(text: string): string {
    const textLower = text.toLowerCase();
    if (textLower.includes('регистрац') || textLower.includes('аккаунт')) return 'user-plus';
    if (textLower.includes('поиск') || textLower.includes('найти')) return 'search';
    if (textLower.includes('что такое') || textLower.includes('как ') || textLower.includes('почему')) return 'help-circle';
    if (textLower.includes('документ') || textLower.includes('файл') || textLower.includes('подать')) return 'file-text';
    if (textLower.includes('ошибк') || textLower.includes('проблем') || textLower.includes('не работает')) return 'alert-triangle';
    return 'message-square';
}

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize connection state to CLOSED
    const [connectionState, setConnectionState] = useState<WebSocketState>(WebSocketState.CLOSED);
    const [isTyping, setIsTyping] = useState(false);
    const [expectingAiResponse, setExpectingAiResponse] = useState(false);
    const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
    const [streamedContent, setStreamedContent] = useState('');
    const [chatSuggestions, setChatSuggestions] = useState<MessageSuggestion[]>([]);
    const [chatNameUpdate, setChatNameUpdate] = useState<string | null>(null);
    const [lastCompletedMessage, setLastCompletedMessage] = useState<{
        id: string;
        content: string;
        sources?: Source[];
    } | null>(null);
    const [lastConnectionError, setLastConnectionError] = useState<{ code?: number; reason?: string; error?: Error } | null>(null);

    const webSocketRef = useRef<WebSocketService | null>(null);
    const messageListenersRef = useRef<Array<(message: WebSocketMessage) => void>>([]);
    const messageChunksRef = useRef<Record<string, string>>({});
    const completedMessagesRef = useRef<Set<string>>(new Set());
    const processedChunkHashesRef = useRef<Set<string>>(new Set());
    const chunkCountRef = useRef<Record<string, number>>({});
    const lastChunkTimeRef = useRef<Record<string, number>>({});
    const forceCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messageCompletionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const currentChatIdRef = useRef<string | null>(null);
    const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const typingStartTimestampRef = useRef<number | null>(null);

    const isConnected = connectionState === WebSocketState.OPEN;

    // --- State Clearing Callbacks ---
    const clearSuggestions = useCallback(() => setChatSuggestions([]), []);
    const clearLastCompletedMessage = useCallback(() => setLastCompletedMessage(null), []);
    const clearChatNameUpdate = useCallback(() => setChatNameUpdate(null), []);

    // --- Message Handling Logic ---
    const handleMessageComplete = useCallback((message: MessageComplete) => {
        const { message_id, sources, suggestions, chat_name } = message;
        // console.log(`Handling 'complete' message for message ID: ${message_id}`); // Debug

        if (forceCompleteTimeoutRef.current) clearTimeout(forceCompleteTimeoutRef.current);
        forceCompleteTimeoutRef.current = null;
        if (completedMessagesRef.current.has(message_id)) return;
        completedMessagesRef.current.add(message_id);

        const completeContent = messageChunksRef.current[message_id] || '';
        delete messageChunksRef.current[message_id];
        delete lastChunkTimeRef.current[message_id];
        delete chunkCountRef.current[message_id];
        processedChunkHashesRef.current.clear();

        if (chat_name) setChatNameUpdate(chat_name);

        const completedMessage = { id: message_id, content: completeContent, sources: sources || [] };
        setLastCompletedMessage(completedMessage);

        if (suggestions?.length > 0) {
            const formatted = suggestions.map((text, index) => ({
                id: `suggestion-complete-${Date.now()}-${index}`, text, icon: getIconForSuggestion(text)
            }));
            setChatSuggestions(formatted);
            if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
            suggestionsTimeoutRef.current = setTimeout(clearSuggestions, 30 * 60 * 1000);
        }

        if (pendingMessageId === message_id) {
            setIsTyping(false);
            setExpectingAiResponse(false);
            setPendingMessageId(null);
            setStreamedContent('');
            typingStartTimestampRef.current = null;
        }
    }, [pendingMessageId, clearSuggestions]);

    const handleMessageChunk = useCallback((message: MessageChunk) => {
        const { message_id, content, suggestions, chat_name } = message;

        if (completedMessagesRef.current.has(message_id)) return;

        if (!chunkCountRef.current[message_id]) chunkCountRef.current[message_id] = 0;
        const chunkHash = `${message_id}_${chunkCountRef.current[message_id]}_${content.length}`;
        if (processedChunkHashesRef.current.has(chunkHash)) return;
        processedChunkHashesRef.current.add(chunkHash);

        if (!messageChunksRef.current[message_id]) messageChunksRef.current[message_id] = "";
        chunkCountRef.current[message_id]++;
        lastChunkTimeRef.current[message_id] = Date.now();
        messageChunksRef.current[message_id] += content;

        if (pendingMessageId !== message_id) {
            setPendingMessageId(message_id);
            if (!typingStartTimestampRef.current) typingStartTimestampRef.current = Date.now();
        }

        setIsTyping(true);
        setExpectingAiResponse(false);
        setStreamedContent(messageChunksRef.current[message_id]);

        if (chat_name && !chatNameUpdate) setChatNameUpdate(chat_name);

        if (suggestions?.length > 0) {
            const formatted = suggestions.map((text, index) => ({
                id: `suggestion-chunk-${Date.now()}-${index}`, text, icon: getIconForSuggestion(text)
            }));
            setChatSuggestions(formatted);
            if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
            suggestionsTimeoutRef.current = setTimeout(clearSuggestions, 30 * 60 * 1000);
        }

        if (forceCompleteTimeoutRef.current) clearTimeout(forceCompleteTimeoutRef.current);
        forceCompleteTimeoutRef.current = setTimeout(() => {
            if (pendingMessageId === message_id && isTyping) {
                console.warn(`Force completing message ${message_id} due to absolute timeout (60s)`);
                handleMessageComplete({ type: "complete", message_id });
            }
        }, 60000);
    }, [pendingMessageId, chatNameUpdate, handleMessageComplete, clearSuggestions, isTyping]);

    const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
        messageListenersRef.current.forEach(listener => listener(message));
        if (!message.type) return;
        switch (message.type) {
            case "chunk": handleMessageChunk(message as MessageChunk); break;
            case "complete": handleMessageComplete(message as MessageComplete); break;
            case "stream_content":
                if (message.content && message.message_id) {
                    handleMessageChunk({ type: "chunk", message_id: message.message_id, content: message.content, suggestions: message.suggestions, chat_name: message.chat_name });
                } break;
            case "suggestions":
                if (message.suggestions && Array.isArray(message.suggestions)) {
                    const formatted = message.suggestions.map((text, index) => ({ id: `suggestion-${Date.now()}-${index}`, text, icon: getIconForSuggestion(text) }));
                    setChatSuggestions(formatted);
                } break;
            case "connection_established":
                if (message.suggestions && Array.isArray(message.suggestions)) {
                    const formatted = message.suggestions.map((text, index) => ({ id: `suggestion-${Date.now()}-${index}`, text, icon: getIconForSuggestion(text) }));
                    setChatSuggestions(formatted);
                    console.log("Suggestions received on connection:", formatted);
                } break;
        }
    }, [handleMessageChunk, handleMessageComplete]);

    // --- Completion Checker ---
    const checkForCompletedMessages = useCallback(() => {
        const now = Date.now();
        const currentPendingId = pendingMessageId;

        // Check for stalled streams (long time since last chunk)
        if (currentPendingId && isTyping && lastChunkTimeRef.current[currentPendingId]) {
            const stallTimeout = 20000; // 20 seconds without new chunks
            if (now - lastChunkTimeRef.current[currentPendingId] > stallTimeout) {
                console.warn(`No new chunks received for ${stallTimeout}ms for message ${currentPendingId}. Forcing completion.`);
                if (pendingMessageId === currentPendingId) { // Double check it's still the same message
                    handleMessageComplete({ type: "complete", message_id: currentPendingId });
                }
            }
        }

        // Check for timeout waiting for the *first* chunk
        if (expectingAiResponse && !isTyping && typingStartTimestampRef.current) {
            const firstChunkTimeout = 30000; // 30 seconds to receive the first chunk
            if (now - typingStartTimestampRef.current > firstChunkTimeout) {
                console.warn(`Timeout (${firstChunkTimeout}ms) waiting for first chunk for message ${pendingMessageId}. Resetting expectation state.`);
                if (expectingAiResponse && !isTyping) {
                    setExpectingAiResponse(false);
                    setPendingMessageId(null);
                    typingStartTimestampRef.current = null;
                    // Maybe set an error state here?
                }
            }
        }
    }, [pendingMessageId, isTyping, expectingAiResponse, handleMessageComplete]);

    // --- WebSocket Connection Management ---
    const disconnectWebSocket = useCallback(() => {
        console.log(`WebSocketContext: Disconnecting WebSocket (if connected)`);
        webSocketRef.current?.disconnect(); // Let the service handle cleanup
        webSocketRef.current = null; // Clear ref immediately
        // Reset state *after* calling disconnect
        setConnectionState(WebSocketState.CLOSED);
        setIsTyping(false);
        setExpectingAiResponse(false);
        setPendingMessageId(null);
        setStreamedContent('');
        setChatNameUpdate(null);
        currentChatIdRef.current = null;
        setLastConnectionError(null);
        if (forceCompleteTimeoutRef.current) clearTimeout(forceCompleteTimeoutRef.current);
        if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
        if (messageCompletionCheckIntervalRef.current) clearInterval(messageCompletionCheckIntervalRef.current);
        messageCompletionCheckIntervalRef.current = null;
    }, []); // No dependencies

    const connectWebSocket = useCallback(async (chatId: string, isNewChat: boolean = false): Promise<boolean> => {
        console.log(`WebSocketContext: Attempting to connect to chat ${chatId}`);

        // Disconnect if connecting to a different chat
        if (webSocketRef.current && currentChatIdRef.current !== chatId) {
            console.log(`WebSocketContext: Disconnecting from previous chat ${currentChatIdRef.current} before connecting to ${chatId}`);
            disconnectWebSocket(); // Use the cleanup function
        } else if (webSocketRef.current?.isConnected()) {
            console.log(`WebSocketContext: Already connected to chat ${chatId}`);
            setConnectionState(WebSocketState.OPEN); // Ensure state is correct
            return true;
        } else if (webSocketRef.current?.getState() === WebSocketState.CONNECTING) {
            console.log(`WebSocketContext: Already connecting to chat ${chatId}`);
            // Return the existing promise if available, otherwise indicate connection is in progress
            return webSocketRef.current.connect(); // Re-call connect to get the promise
        }

        // Reset state before new attempt
        currentChatIdRef.current = chatId;
        setConnectionState(WebSocketState.CONNECTING); // Set connecting state
        setLastConnectionError(null);
        setIsTyping(false);
        setExpectingAiResponse(false);
        setPendingMessageId(null);
        setStreamedContent('');
        setChatNameUpdate(null);
        if (!isNewChat) setChatSuggestions([]);
        messageChunksRef.current = {};
        completedMessagesRef.current.clear();
        processedChunkHashesRef.current.clear();
        chunkCountRef.current = {};
        lastChunkTimeRef.current = {};
        typingStartTimestampRef.current = null;
        if (forceCompleteTimeoutRef.current) clearTimeout(forceCompleteTimeoutRef.current);
        if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);

        const token = localStorage.getItem('jwt_token');
        if (!token) {
            console.error("WebSocketContext: Cannot connect: No authentication token found");
            setConnectionState(WebSocketState.CLOSED);
            setLastConnectionError({ reason: "Authentication token not found" });
            return false;
        }

        try {
            const ws = new WebSocketService(chatId, token);
            webSocketRef.current = ws; // Store the new instance
            ws.setNewChatFlag(isNewChat);

            // --- Setup Listeners ---
            ws.addMessageListener(handleWebSocketMessage);

            // Connection status listener
            const handleConnectionStatus = (status: 'open' | 'closed' | 'error', code?: number, reason?: string) => {
                console.log(`WebSocketContext: Connection status update for chat ${chatId}: ${status}, code: ${code}, reason: ${reason}`);
                // Update state only if this WS instance is still the current one
                if (webSocketRef.current === ws) {
                    switch (status) {
                        case 'open':
                            setConnectionState(WebSocketState.OPEN);
                            setLastConnectionError(null);
                            break;
                        case 'closed':
                            setConnectionState(WebSocketState.CLOSED);
                            setIsTyping(false);
                            setExpectingAiResponse(false);
                            // Set error only if it was an unexpected close
                            if (code !== 1000) {
                                setLastConnectionError({ code, reason: reason || `Closed unexpectedly (${code})` });
                            }
                            break;
                        case 'error':
                            // The 'close' event usually follows, so we mainly store the error details
                            setLastConnectionError(prev => ({ ...prev, code, reason: reason || "WebSocket error" }));
                            // Optionally set state to CLOSED immediately on error
                            // setConnectionState(WebSocketState.CLOSED);
                            break;
                    }
                } else {
                    console.warn(`WebSocketContext: Received status update for outdated WS instance (chat ${chatId})`);
                }
            };
            ws.addConnectionListener(handleConnectionStatus);

            // Error listener (might be redundant if connection listener handles error status)
            const handleErrorCallback = (error: any) => {
                if (webSocketRef.current === ws) {
                    console.error(`WebSocketContext: Error listener triggered for chat ${chatId}:`, error);
                    setLastConnectionError(prev => ({...prev, error: error instanceof Error ? error : new Error(String(error)) }));
                }
            };
            ws.addErrorListener(handleErrorCallback);
            // --- End Listeners ---

            const success = await ws.connect(); // Wait for connection result

            // Check if the chat ID changed *while* we were connecting
            if (currentChatIdRef.current !== chatId) {
                console.warn(`WebSocketContext: Chat changed during connection attempt for ${chatId}. Disconnecting the stale connection.`);
                ws.disconnect(); // Disconnect the now irrelevant connection
                return false;
            }

            if (!success) {
                console.warn(`WebSocketContext: Failed to connect to chat ${chatId}. State: ${ws.getState()}`);
                // Ensure state reflects failure if connect promise resolves false
                setConnectionState(WebSocketState.CLOSED);
                if (!lastConnectionError) setLastConnectionError({ reason: "Connection failed", error: ws['lastError'] });
            } else {
                console.log(`WebSocketContext: Successfully connected to chat ${chatId}`);
                setConnectionState(WebSocketState.OPEN);
            }
            return success;

        } catch (error) {
            console.error(`WebSocketContext: Exception during connectWebSocket for chat ${chatId}:`, error);
            if (currentChatIdRef.current === chatId) {
                setConnectionState(WebSocketState.CLOSED);
                setLastConnectionError({ reason: "Connection initialization failed", error: error instanceof Error ? error : new Error(String(error)) });
            }
            return false;
        }
    }, [disconnectWebSocket, handleWebSocketMessage, lastConnectionError]); // Dependencies

    const startExpectingAiResponse = useCallback((messageId: string) => {
        console.log("WebSocketContext: Setting expecting AI response for message:", messageId);
        setExpectingAiResponse(true);
        setPendingMessageId(messageId);
        setIsTyping(false); // AI isn't typing *yet*
        setStreamedContent('');
        messageChunksRef.current[messageId] = ''; // Init storage
        lastChunkTimeRef.current[messageId] = Date.now();
        typingStartTimestampRef.current = Date.now(); // Track when we started waiting
        completedMessagesRef.current.delete(messageId); // Ensure it's not marked complete yet
        processedChunkHashesRef.current.clear(); // Clear hashes for new message
    }, []);

    // --- Listener Management ---
    const addMessageListener = useCallback((listener: (message: WebSocketMessage) => void) => { messageListenersRef.current.push(listener); }, []);
    const removeMessageListener = useCallback((listener: (message: WebSocketMessage) => void) => { messageListenersRef.current = messageListenersRef.current.filter(l => l !== listener); }, []);

    // --- Effects ---
    // Start/Stop message completion checker
    useEffect(() => {
        const shouldCheck = isConnected || expectingAiResponse || isTyping;
        if (shouldCheck && !messageCompletionCheckIntervalRef.current) {
            // console.log("Starting message completion checker interval"); // Debug
            messageCompletionCheckIntervalRef.current = setInterval(checkForCompletedMessages, 7000); // Check every 7 seconds
        } else if (!shouldCheck && messageCompletionCheckIntervalRef.current) {
            // console.log("Stopping message completion checker interval"); // Debug
            clearInterval(messageCompletionCheckIntervalRef.current);
            messageCompletionCheckIntervalRef.current = null;
        }
        // Cleanup interval on unmount
        return () => {
            if (messageCompletionCheckIntervalRef.current) {
                clearInterval(messageCompletionCheckIntervalRef.current);
                messageCompletionCheckIntervalRef.current = null;
            }
        };
    }, [isConnected, expectingAiResponse, isTyping, checkForCompletedMessages]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log("WebSocketProvider unmounting, disconnecting WebSocket.");
            disconnectWebSocket();
        };
    }, [disconnectWebSocket]);

    const value = {
        connectWebSocket,
        disconnectWebSocket,
        isConnected,
        connectionState,
        isTyping,
        expectingAiResponse,
        pendingMessageId,
        streamedContent,
        chatSuggestions,
        lastCompletedMessage,
        chatNameUpdate,
        addMessageListener,
        removeMessageListener,
        checkForCompletedMessages,
        clearSuggestions,
        clearLastCompletedMessage,
        clearChatNameUpdate,
        startExpectingAiResponse,
        lastConnectionError,
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