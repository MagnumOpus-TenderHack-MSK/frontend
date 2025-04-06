// src/components/chat/chat-app.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Shield, X, Menu, LogOut, WifiOff, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatSidebar } from "./chat-sidebar";
import { ChatInput } from "./chat-input";
import { MessageManager } from "./message-manager";
import { ThemeToggle } from "../theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import { WebSocketProvider, useWebSocket } from "@/contexts/websocket-context";
import {
    Chat,
    ChatMessage,
    MessageSuggestion,
    ReactionType,
    FileType,
    MessageStatus,
    Source,
    MessageType
} from "@/lib/types";
import { ChatApi } from "@/lib/chat-api";
import { FileApi } from "@/lib/file-api";
import { WebSocketState } from "@/lib/websocket-service";

// Default suggestions remain the same...
const DEFAULT_SUGGESTIONS: MessageSuggestion[] = [
    { id: "default-sug-1", text: "Как зарегистрироваться на портале?", icon: "user-plus" },
    { id: "default-sug-2", text: "Как найти активные закупки?", icon: "search" },
    { id: "default-sug-3", text: "Что такое котировочная сессия?", icon: "help-circle" },
    { id: "default-sug-4", text: "Как подать заявку на участие?", icon: "file-text" },
    { id: "default-sug-5", text: "Технические проблемы с входом", icon: "alert-triangle" },
];

function getIconForSuggestion(text: string): string {
    const textLower = text.toLowerCase();
    if (textLower.includes('регистрац') || textLower.includes('аккаунт')) return 'user-plus';
    if (textLower.includes('поиск') || textLower.includes('найти')) return 'search';
    if (textLower.includes('что такое') || textLower.includes('как ') || textLower.includes('почему')) return 'help-circle';
    if (textLower.includes('документ') || textLower.includes('файл') || textLower.includes('подать')) return 'file-text';
    if (textLower.includes('ошибк') || textLower.includes('проблем') || textLower.includes('не работает')) return 'alert-triangle';
    return 'message-square';
}


const ChatAppContent = () => {
    const { user, logout } = useAuth();
    const {
        connectWebSocket,
        disconnectWebSocket,
        isConnected,
        connectionState,
        isTyping,
        expectingAiResponse,
        pendingMessageId,
        streamedContent,
        chatSuggestions,
        chatNameUpdate,
        lastCompletedMessage,
        clearSuggestions,
        clearLastCompletedMessage,
        clearChatNameUpdate,
        startExpectingAiResponse,
        lastConnectionError,
    } = useWebSocket();

    const [mounted, setMounted] = useState(false);
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<Chat[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [initialSuggestions, setInitialSuggestions] = useState<MessageSuggestion[]>(DEFAULT_SUGGESTIONS);
    const [error, setError] = useState<string | null>(null);
    const [fileUploadProgress, setFileUploadProgress] = useState<number | null>(null);

    const initialLoadCompleteRef = useRef(false);
    const connectingChatIdRef = useRef<string | null>(null); // Ref to prevent race conditions during connection


    const currentChat = activeChat
        ? chatHistory.find((chat) => chat.id === activeChat)
        : null;

    // --- Effect to handle chat name updates ---
    useEffect(() => {
        if (chatNameUpdate && activeChat) {
            const chatIndex = chatHistory.findIndex(chat => chat.id === activeChat);
            if (chatIndex === -1) return; // Chat not found

            const currentTitle = chatHistory[chatIndex].title;
            const isDefaultTitle = currentTitle === "Новый чат" || !currentTitle;

            if (isDefaultTitle) {
                console.log(`ChatApp: Updating title for chat ${activeChat} to: ${chatNameUpdate}`);
                setChatHistory(prevHistory => {
                    const newHistory = prevHistory.map(chat =>
                        chat.id === activeChat ? { ...chat, title: chatNameUpdate } : chat
                    );
                    // Re-sort after title update to maintain order
                    return newHistory.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                });
                clearChatNameUpdate(); // Clear after applying
            } else {
                console.log(`ChatApp: Skipping title update for chat ${activeChat}, current title is not default: ${currentTitle}`);
                clearChatNameUpdate(); // Clear even if not applied
            }
        }
    }, [chatNameUpdate, activeChat, chatHistory, clearChatNameUpdate]); // Ensure chatHistory is a dependency if used for finding index


    // Function to load chat list
    const loadChats = useCallback(async () => {
        // Prevent reload if already loading
        if (isLoadingChats) return;

        console.log("ChatApp: Loading chat list...");
        setIsLoadingChats(true);
        setError(null);
        try {
            const response = await ChatApi.getChats();
            const sortedChats = [...response.items].sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            setChatHistory(sortedChats);

            if (sortedChats.length > 0 && (!activeChat || !sortedChats.some(c => c.id === activeChat))) {
                const initialChatId = sortedChats[0].id;
                console.log(`ChatApp: Setting initial active chat to ${initialChatId}`);
                setActiveChat(initialChatId);
            } else if (sortedChats.length === 0) {
                console.log("ChatApp: No chats found, setting active chat to null");
                setActiveChat(null);
            }
            initialLoadCompleteRef.current = true;

        } catch (err: any) {
            console.error("ChatApp: Error loading chats:", err);
            setError(err.message || "Failed to load chats.");
        } finally {
            setIsLoadingChats(false);
        }
    }, [activeChat, isLoadingChats]); // Dependencies

    // Function to load messages for a specific chat
    const loadChatMessages = useCallback(async (chatId: string) => {
        if (isLoadingMessages) return []; // Prevent concurrent loading

        console.log(`ChatApp: Loading messages for chat ${chatId}...`);
        setIsLoadingMessages(true); // Set loading true *before* API call
        setError(null);
        try {
            const messageResponse = await ChatApi.getChatMessages(chatId);
            const fetchedMessages = messageResponse.items || [];

            setChatHistory((prev) =>
                prev.map((chat) =>
                    chat.id === chatId ? { ...chat, messages: fetchedMessages } : chat
                )
            );
            console.log(`ChatApp: Loaded ${fetchedMessages.length} messages for chat ${chatId}`);
            return fetchedMessages;
        } catch (err: any) {
            console.error(`ChatApp: Error loading messages for chat ${chatId}:`, err);
            setError(err.message || "Failed to load chat messages.");
            return []; // Return empty on error
        } finally {
            setIsLoadingMessages(false); // Set loading false *after* API call completes/fails
        }
    }, [isLoadingMessages]); // Dependency


    // Function to create a new chat
    const createNewChat = useCallback(async () => {
        console.log("ChatApp: Creating new chat...");
        setError(null);
        setIsLoadingChats(true); // Indicate loading while creating
        try {
            const newChat = await ChatApi.createChat({ title: "Новый чат" });
            console.log(`ChatApp: New chat created with ID ${newChat.id}`);
            setChatHistory((prev) => [newChat, ...prev]);
            setActiveChat(newChat.id.toString());
            setSidebarOpen(false);
        } catch (err: any) {
            console.error("ChatApp: Error creating new chat:", err);
            setError(err.message || "Failed to create new chat.");
        } finally {
            setIsLoadingChats(false); // Stop loading indicator
        }
    }, []);

    // Function to handle switching chats
    const handleChatSelect = useCallback(async (chatId: string) => {
        // Prevent selecting the same chat or selecting while connecting
        if (activeChat === chatId || connectingChatIdRef.current === chatId) {
            console.log(`ChatApp: Skipping chat select for ${chatId} (already active or connecting)`);
            return;
        }
        console.log(`ChatApp: Selecting chat ${chatId}`);

        connectingChatIdRef.current = chatId; // Mark as attempting to switch/connect
        setSidebarOpen(false);
        setActiveChat(chatId); // Optimistically set active chat

        // Load messages if they aren't already loaded or present
        const chat = chatHistory.find(c => c.id === chatId);
        if (chat && (!chat.messages || chat.messages.length === 0)) {
            await loadChatMessages(chatId);
        }
        // Clear the ref *after* potential loading is done
        connectingChatIdRef.current = null;

    }, [activeChat, loadChatMessages, chatHistory]);

    // Deduplicate and sort messages helper function
    const deduplicateAndSortMessages = useCallback((messages: ChatMessage[] = []) => {
        const uniqueMessages = new Map<string, ChatMessage>();
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


    // Function to send a message within a specific chat
    const sendMessageToChat = useCallback(async (
        chatId: string,
        content: string,
        fileIds: string[] = [],
        fileReferences: any[] = []
    ): Promise<string | null> => { // Return potential AI message ID
        let optimisticAiMessageId: string | null = null;
        let userMessageId: string = `temp-user-${Date.now()}`; // Define user temp ID here

        try {
            // Create optimistic user message structure
            const optimisticUserMessage: ChatMessage = {
                id: userMessageId, chat_id: chatId, content, message_type: MessageType.USER,
                status: MessageStatus.COMPLETED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                files: fileReferences.length > 0 ? fileReferences.map(f => ({...f, id: f.id.toString()})) : [],
                sources: [], reactions: [],
            };

            // Check for support request *before* adding optimistic AI
            const isSupportRequest = ["оператор", "поддержк", "консультант", "помощник", "специалист"]
                .some(keyword => content.toLowerCase().includes(keyword));

            const optimisticMessagesToAdd = [optimisticUserMessage];
            if (!isSupportRequest) {
                optimisticAiMessageId = `temp-ai-${Date.now()}`;
                const optimisticAiMessage: ChatMessage = {
                    id: optimisticAiMessageId, chat_id: chatId, content: "", message_type: MessageType.AI,
                    status: MessageStatus.PENDING, created_at: new Date(Date.now() + 1).toISOString(),
                    updated_at: new Date(Date.now() + 1).toISOString(), sources: [], files: [], reactions: [],
                };
                optimisticMessagesToAdd.push(optimisticAiMessage);
                console.log(`ChatApp: Adding optimistic AI message ${optimisticAiMessageId}`);
            }

            // === Batch State Update ===
            setChatHistory((prev) => {
                const chatIndex = prev.findIndex(chat => chat.id === chatId);
                if (chatIndex === -1) return prev;

                const updatedChat = { ...prev[chatIndex] };
                const existingMessages = updatedChat.messages || [];
                updatedChat.messages = deduplicateAndSortMessages([...existingMessages, ...optimisticMessagesToAdd]);
                updatedChat.updated_at = new Date().toISOString();

                if ((updatedChat.title === "Новый чат" || !updatedChat.title) && existingMessages.length === 0) {
                    updatedChat.title = content.length > 30 ? content.substring(0, 30) + "..." : content;
                }

                const otherChats = prev.filter(chat => chat.id !== chatId);
                return [updatedChat, ...otherChats];
            });
            // === End Batch State Update ===


            // === API Call ===
            console.log(`ChatApp: Sending message API request for chat ${chatId}...`);
            const backendResponse = await ChatApi.sendMessage(chatId, { content, file_ids: fileIds });
            console.log(`ChatApp: Message API request successful for chat ${chatId}. Backend user msg ID: ${backendResponse.id}`);
            // === End API Call ===

            // === Update State with Real User Message ID ===
            // Replace the optimistic user message with the confirmed one from the backend
            // We will remove the optimistic AI message *after* confirming the backend call,
            // but before calling startExpectingAiResponse if needed.
            setChatHistory((prev) =>
                prev.map((chat) => {
                    if (chat.id === chatId) {
                        const finalMessages = (chat.messages || [])
                            // Map: Replace temp user msg with backend confirmed msg
                            .map(msg => msg.id === userMessageId ? { ...backendResponse, files: optimisticUserMessage.files } : msg)
                            // Filter: Remove the temp AI msg if it exists *and* we added one
                            .filter(msg => !(optimisticAiMessageId && msg.id === optimisticAiMessageId));
                        return { ...chat, messages: finalMessages };
                    }
                    return chat;
                })
            );
            // === End State Update ===


            // Return the optimistic ID ONLY if we added one (and it wasn't a support request)
            return isSupportRequest ? null : optimisticAiMessageId;

        } catch (error: any) {
            console.error(`ChatApp: Error sending message to chat ${chatId}:`, error);
            // Rollback optimistic updates on error
            setChatHistory((prev) =>
                prev.map((chat) => {
                    if (chat.id === chatId) {
                        return {
                            ...chat,
                            messages: (chat.messages || []).filter(msg => !msg.id.startsWith('temp-'))
                        };
                    }
                    return chat;
                })
            );
            setError(`Failed to send message: ${error.message}`);
            throw error; // Rethrow
        }
    }, [deduplicateAndSortMessages]);

    // Function to handle sending a message (main entry point)
    const handleSendMessage = useCallback(async (message: string, files?: File[]) => {
        if ((!message || !message.trim()) && (!files || files.length === 0)) return;

        let targetChatId = activeChat;
        let requiresConnection = false; // Flag if connection needs check/establishment

        try {
            setError(null);
            let fileIds: string[] = [];
            let fileReferences: any[] = [];

            // --- File Upload ---
            if (files && files.length > 0) {
                setFileUploadProgress(0);
                try {
                    const responses = await FileApi.uploadMultipleFiles(files, (progress) => setFileUploadProgress(progress));
                    fileIds = responses.map(res => res.id.toString());
                    fileReferences = responses.map(res => ({
                        id: res.id, name: res.name || res.original_name,
                        file_type: res.file_type.toString(), preview_url: res.preview_url,
                    }));
                } catch(uploadError: any) {
                    console.error("ChatApp: File upload failed:", uploadError);
                    setError(`File upload failed: ${uploadError.message}`);
                    setFileUploadProgress(null); return; // Stop
                } finally {
                    setFileUploadProgress(null);
                }
            }
            // --- End File Upload ---

            // --- Ensure Target Chat and Connection ---
            if (!targetChatId) {
                console.log("ChatApp: No active chat, creating new one for message.");
                const chatTitle = message.length > 30 ? message.substring(0, 30) + "..." : message || "Chat with Files";
                const newChat = await ChatApi.createChat({ title: chatTitle });
                targetChatId = newChat.id.toString();
                setChatHistory((prev) => [newChat, ...prev]);
                setActiveChat(targetChatId); // Set active chat *before* connecting
                requiresConnection = true; // New chat definitely needs connection
                console.log(`ChatApp: Set new chat ${targetChatId} as active`);
            } else {
                // Check if connection exists for the *current* active chat
                requiresConnection = !isConnected && connectionState !== WebSocketState.CONNECTING;
                if (requiresConnection) {
                    console.log(`ChatApp: WebSocket needs connection for existing chat ${targetChatId}.`);
                }
            }

            // Connect if needed *before* sending the message
            if (requiresConnection) {
                console.log(`ChatApp: Attempting WebSocket connect for chat ${targetChatId}...`);
                const connected = await connectWebSocket(targetChatId, !activeChat); // Pass true if it was a new chat
                if (!connected) {
                    console.error(`ChatApp: Failed to connect WebSocket for chat ${targetChatId}. Cannot send message.`);
                    setError("Failed to connect to chat service. Please try again.");
                    return; // Stop if connection failed
                }
                // Optional delay after connection? Might not be needed if connectWebSocket resolves properly.
                // await new Promise(resolve => setTimeout(resolve, 100));
            }
            // --- End Ensure Target Chat and Connection ---


            // --- Send Message ---
            // Make sure targetChatId is set
            if (!targetChatId) {
                console.error("ChatApp: targetChatId is still null after connection check. Aborting send.");
                setError("An internal error occurred. Please select a chat or try again.");
                return;
            }
            // Call the separated function to handle optimistic updates and API call
            const optimisticAiMsgId = await sendMessageToChat(targetChatId, message, fileIds, fileReferences);
            // --- End Send Message ---


            // --- Start Expecting AI Response ---
            // Call this *after* sendMessageToChat has successfully completed
            if (optimisticAiMsgId) {
                startExpectingAiResponse(optimisticAiMsgId);
            }
            // --- End Start Expecting AI Response ---

            setSidebarOpen(false);
            clearSuggestions();

        } catch (error: any) {
            console.error("ChatApp: Error in handleSendMessage:", error);
            // Error is likely already set by sendMessageToChat
            if (!error) setError(error.message || "Failed to send message.");
            setFileUploadProgress(null);
        }
    }, [
        activeChat, isConnected, connectionState, /* Removed sendMessageToChat */ // Avoid direct dependency if possible
        connectWebSocket, startExpectingAiResponse, clearSuggestions,
        sendMessageToChat // Add the separated function back as dependency
    ]);


    // Function to handle message reactions
    const handleMessageReaction = useCallback(async (messageId: string, reaction: "like" | "dislike") => {
        if (!activeChat) return;

        let messageExists = false;
        chatHistory.forEach(chat => { // Check if message exists without modifying state yet
            if (chat.id === activeChat && (chat.messages || []).some(msg => msg.id === messageId)) {
                messageExists = true;
            }
        });
        if (!messageExists) return;

        const tempReactionId = `temp-reaction-${Date.now()}`;
        const apiReactionType = reaction.toUpperCase() as ReactionType;

        // Optimistic UI update
        setChatHistory(prevHistory =>
            prevHistory.map(chat => {
                if (chat.id === activeChat) {
                    return {
                        ...chat,
                        messages: (chat.messages || []).map(msg => {
                            if (msg.id === messageId) {
                                // Replace reactions array
                                const newReactions = [{
                                    id: tempReactionId, message_id: messageId,
                                    reaction_type: reaction, // schema expects string, backend ReactionType enum
                                    created_at: new Date().toISOString(),
                                }];
                                return { ...msg, reactions: newReactions };
                            }
                            return msg;
                        }),
                    };
                }
                return chat;
            })
        );

        // API Call
        try {
            setError(null);
            await ChatApi.addReaction(activeChat, messageId, { reaction_type: apiReactionType });
        } catch (error: any) {
            console.error(`ChatApp: Error sending reaction for message ${messageId}:`, error);
            setError(`Failed to update reaction: ${error.message}`);
            loadChatMessages(activeChat); // Revert UI on error
        }
    }, [activeChat, chatHistory, loadChatMessages]); // chatHistory needed to check existence

    // Function to handle support request
    const handleRequestSupport = useCallback(async () => {
        console.log("ChatApp: Requesting support...");
        let targetChatId = activeChat;
        let requiresConnection = false;

        try {
            setError(null);
            if (!targetChatId) {
                const newChat = await ChatApi.createChat({ title: "Запрос поддержки" });
                targetChatId = newChat.id.toString();
                setChatHistory(prev => [newChat, ...prev]);
                setActiveChat(targetChatId);
                requiresConnection = true;
            } else {
                requiresConnection = !isConnected && connectionState !== WebSocketState.CONNECTING;
            }

            if (requiresConnection) {
                const connected = await connectWebSocket(targetChatId, !activeChat);
                if (!connected) {
                    setError("Failed to connect to chat service for support request.");
                    return;
                }
            }

            if (!targetChatId) throw new Error("Target chat ID not set for support request.");

            await sendMessageToChat(targetChatId, "Я хотел бы подключиться к оператору поддержки.");

        } catch (error: any) {
            console.error("ChatApp: Error requesting support:", error);
            setError(`Failed to request support: ${error.message}`);
        }
    }, [activeChat, isConnected, connectionState, connectWebSocket, sendMessageToChat]);

    // Function to handle suggestion click
    const handleSuggestionClick = useCallback((text: string) => {
        handleSendMessage(text);
    }, [handleSendMessage]);

    // --- Effects ---

    // Load chats on initial mount or when user changes
    useEffect(() => {
        if (user && !initialLoadCompleteRef.current) {
            loadChats();
        } else if (!user) {
            setChatHistory([]);
            setActiveChat(null);
            setIsLoadingChats(true);
            initialLoadCompleteRef.current = false;
            disconnectWebSocket();
        }
    }, [user, loadChats, disconnectWebSocket]);

    // Connect/Disconnect WebSocket based on activeChat and user status
    useEffect(() => {
        const chatId = activeChat; // Capture current activeChat

        const manageConnection = async () => {
            if (chatId && user) {
                console.log(`ChatApp Effect: Ensuring connection for chat ${chatId}... State: ${connectionState}`);
                // Only connect if not already open or connecting
                if (connectionState !== WebSocketState.OPEN && connectionState !== WebSocketState.CONNECTING) {
                    // Load messages first if needed
                    const chatData = chatHistory.find(c => c.id === chatId);
                    const needsLoad = !chatData?.messages?.length;
                    if (needsLoad) {
                        await loadChatMessages(chatId);
                        // Check if chat changed during load
                        if (activeChat !== chatId) {
                            console.log(`ChatApp Effect: Chat changed from ${chatId} after loading messages. Aborting connection.`);
                            return;
                        }
                    }
                    console.log(`ChatApp Effect: Calling connectWebSocket for ${chatId}`);
                    await connectWebSocket(chatId, false);
                } else {
                    console.log(`ChatApp Effect: Skipping connect for ${chatId} (already connected/connecting)`);
                }
            } else if (!chatId && isConnected) {
                // Disconnect if no chat is active and we are connected
                console.log("ChatApp Effect: No active chat and WS is connected, disconnecting.");
                disconnectWebSocket();
            }
        };

        manageConnection();

        // No cleanup disconnect needed here, handled by disconnectWebSocket calls

    }, [activeChat, user, isConnected, connectionState, connectWebSocket, disconnectWebSocket, loadChatMessages, chatHistory]); // Added chatHistory back


    // Process completed messages from WebSocket context
    useEffect(() => {
        if (lastCompletedMessage && activeChat) {
            console.log(`ChatApp: Processing completed message ${lastCompletedMessage.id} for chat ${activeChat}`);
            setChatHistory((prevHistory) => {
                const chatIndex = prevHistory.findIndex(chat => chat.id === activeChat);
                if (chatIndex === -1) return prevHistory;

                const updatedChat = { ...prevHistory[chatIndex] };
                const existingMessages = updatedChat.messages || [];
                const existingMsgIndex = existingMessages.findIndex(msg => msg.id === lastCompletedMessage.id);
                let newMessages;
                const finalMessageData: ChatMessage = {
                    id: lastCompletedMessage.id, chat_id: activeChat,
                    content: lastCompletedMessage.content, message_type: MessageType.AI,
                    status: MessageStatus.COMPLETED, created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(), sources: lastCompletedMessage.sources || [],
                    files: [], reactions: [],
                };

                if (existingMsgIndex !== -1) {
                    newMessages = [...existingMessages];
                    newMessages[existingMsgIndex] = finalMessageData;
                } else {
                    // If message wasn't found (e.g., optimistic removed), add it.
                    console.warn(`Completed message ${lastCompletedMessage.id} not found in existing messages, adding.`);
                    newMessages = [...existingMessages, finalMessageData];
                }

                updatedChat.messages = deduplicateAndSortMessages(newMessages);
                updatedChat.updated_at = new Date().toISOString();

                const otherChats = prevHistory.filter(chat => chat.id !== activeChat);
                return [updatedChat, ...otherChats];
            });
            clearLastCompletedMessage();
        }
    }, [lastCompletedMessage, activeChat, deduplicateAndSortMessages, clearLastCompletedMessage]);

    // Set mounted state
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    // Determine UI states
    const isEffectivelyNewChat = !activeChat || (currentChat && (!currentChat.messages || currentChat.messages.length === 0) && !isTyping && !expectingAiResponse && !pendingMessageId);
    const suggestionsForInput = chatSuggestions.length > 0 ? chatSuggestions : isEffectivelyNewChat ? initialSuggestions : [];
    const isUploading = fileUploadProgress !== null;
    // Show warning only if CLOSED *and* there was an error *and* it's not the initial load state
    const showConnectionWarning = connectionState === WebSocketState.CLOSED && !!lastConnectionError && !!activeChat && !isLoadingChats;
    const showConnectingIndicator = connectionState === WebSocketState.CONNECTING;
    const isInputDisabled = (connectionState !== WebSocketState.OPEN && !!activeChat) || // Disabled if not connected (and a chat is active)
        isTyping || isUploading || expectingAiResponse || isLoadingMessages; // Also disable while loading messages


    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Error notification */}
            {error && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded w-full max-w-md flex justify-between items-center shadow-lg">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-4 text-red-700 hover:text-red-900">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Connection Status Indicator */}
            {showConnectionWarning && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded w-full max-w-lg flex justify-between items-center shadow-lg text-sm">
                    <div className="flex items-center gap-2">
                        <WifiOff size={16} className="text-yellow-600"/>
                        <span>Соединение потеряно. Попытка переподключения...</span>
                    </div>
                    <span className="text-xs text-yellow-600 truncate ml-2" title={lastConnectionError?.reason ?? lastConnectionError?.error?.message}>
                        ({lastConnectionError?.reason ?? lastConnectionError?.error?.message ?? `Code: ${lastConnectionError?.code}`})
                    </span>
                </div>
            )}
            {showConnectingIndicator && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-100 border border-blue-400 text-blue-800 px-4 py-2 rounded w-full max-w-md flex items-center justify-center gap-2 shadow-lg text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                    <span>Подключение к чату...</span>
                </div>
            )}


            {/* File upload progress overlay */}
            {fileUploadProgress !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-card rounded-lg p-6 max-w-sm w-full shadow-xl">
                        <h3 className="text-lg font-medium mb-4 text-card-foreground">Загрузка файлов</h3>
                        <div className="w-full bg-muted rounded-full h-2.5 mb-4 overflow-hidden">
                            <div
                                className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${fileUploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                            {fileUploadProgress}% загружено...
                        </p>
                    </div>
                </div>
            )}

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-20 border-b bg-background/95 backdrop-blur-sm p-4 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="flex md:hidden">
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </Button>
                <div className="flex-1 min-w-0 mx-2">
                    <h1 className="text-lg font-semibold truncate">
                        {currentChat ? currentChat.title : "Портал Поставщиков - Чат"}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    {user?.is_admin && (
                        <Link href="/admin">
                            <Button variant="ghost" size="icon" title="Админ панель"> <Shield size={20} /> </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Sidebar */}
            <div
                className={cn(
                    "fixed inset-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-72 border-r bg-background md:bg-muted/30 flex flex-col",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <ChatSidebar
                    chats={chatHistory} activeChat={activeChat || ""} onChatSelect={handleChatSelect}
                    onNewChat={createNewChat} sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)}
                    user={user}
                    onLogout={logout}
                />
            </div>
            {/* Sidebar overlay for mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col pt-16 md:pt-0"> {/* Increased mobile top padding */}
                {/* Desktop Header */}
                <div className="border-b p-4 hidden md:flex md:justify-between md:items-center sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <div className="flex-1 min-w-0 mr-4">
                        <h1 className="text-xl font-semibold line-clamp-2">
                            {currentChat ? currentChat.title : "Портал Поставщиков - Чат"}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <ThemeToggle />
                        {user?.is_admin && (
                            <Link href="/admin">
                                <Button variant="ghost" size="icon" title="Админ панель"> <Shield size={20} /> </Button>
                            </Link>
                        )}
                        <Button variant="ghost" size="icon" onClick={logout} title="Выйти"> <LogOut size={20} /> </Button>
                    </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 flex flex-col min-h-0">
                    <MessageManager
                        currentChat={currentChat}
                        isLoadingChats={isLoadingChats || isLoadingMessages}
                        isTyping={isTyping}
                        expectingAiResponse={expectingAiResponse}
                        pendingMessageId={pendingMessageId}
                        streamedContent={streamedContent}
                        onMessageReaction={handleMessageReaction}
                        onSuggestionClick={handleSuggestionClick}
                    />
                </div>

                {/* Chat Input */}
                <div className="flex-shrink-0 border-t">
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        onRequestSupport={handleRequestSupport}
                        isLoading={isInputDisabled} // Use combined loading/state flag
                        isTyping={isTyping}
                        isUploading={isUploading}
                        suggestions={suggestionsForInput}
                        aiSuggestions={chatSuggestions}
                        onSuggestionClick={handleSuggestionClick}
                    />
                </div>
            </div>
        </div>
    );
};

// Wrap the component with WebSocketProvider
export default function ChatApp() {
    return (
        <WebSocketProvider>
            <ChatAppContent />
        </WebSocketProvider>
    );
}