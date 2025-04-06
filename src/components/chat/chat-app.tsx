import React, { useState, useEffect, useCallback } from "react";
import { Menu, X, LogOut } from "lucide-react";
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
} from "@/lib/types";
import { ChatApi } from "@/lib/chat-api";
import { FileApi } from "@/lib/file-api";

// Default suggestions for new users
const DEFAULT_SUGGESTIONS: MessageSuggestion[] = [
    { id: "default-sug-1", text: "Как зарегистрироваться на портале?", icon: "user-plus" },
    { id: "default-sug-2", text: "Как найти активные закупки?", icon: "search" },
    { id: "default-sug-3", text: "Что такое котировочная сессия?", icon: "help-circle" },
    { id: "default-sug-4", text: "Как подать заявку на участие?", icon: "file-text" },
    { id: "default-sug-5", text: "Технические проблемы с входом", icon: "alert-triangle" },
];

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

// Inner component to use the WebSocket context
const ChatAppContent = () => {
    const { user, logout } = useAuth();
    const {
        connectWebSocket,
        disconnectWebSocket,
        isConnected,
        isTyping,
        pendingMessageId,
        streamedContent,
        lastCompletedMessage,
        chatSuggestions,
        chatNameUpdate,
        clearSuggestions,
        clearLastCompletedMessage,
    } = useWebSocket();

    const [mounted, setMounted] = useState(false);
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<Chat[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [initialSuggestions, setInitialSuggestions] = useState<MessageSuggestion[]>(DEFAULT_SUGGESTIONS);
    const [inputSuggestions, setInputSuggestions] = useState<MessageSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [fileUploadProgress, setFileUploadProgress] = useState<number | null>(null);
    const [messagesLoaded, setMessagesLoaded] = useState<Record<string, boolean>>({});

    const currentChat = activeChat
        ? chatHistory.find((chat) => chat.id === activeChat)
        : null;

    // Update chat title when we receive a new title from AI
    useEffect(() => {
        if (chatNameUpdate && activeChat) {
            setChatHistory(prevHistory =>
                prevHistory.map(chat =>
                    chat.id === activeChat ?
                        {...chat, title: chatNameUpdate} :
                        chat
                )
            );
        }
    }, [chatNameUpdate, activeChat]);

    const loadChats = async () => {
        try {
            setIsLoadingChats(true);
            setError(null);
            const response = await ChatApi.getChats();

            // Sort chats by updated_at (newest first)
            const sortedChats = [...response.items].sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );

            setChatHistory(sortedChats);

            if (sortedChats.length > 0 && !activeChat) {
                setActiveChat(sortedChats[0].id);
            }
        } catch (err) {
            console.error("Error loading chats:", err);
            setError("Failed to load chats. Please try again later.");
        } finally {
            setIsLoadingChats(false);
        }
    };

    const loadChat = async (chatId: string) => {
        try {
            setError(null);

            // Check if messages were already loaded
            const existingChat = chatHistory.find((c) => c.id === chatId);
            const hasMessages = existingChat && existingChat.messages && existingChat.messages.length > 0;

            // Always reload messages to ensure we have the latest
            const messageResponse = await ChatApi.getChatMessages(chatId);

            // Store that messages were loaded for this chat
            setMessagesLoaded(prev => ({...prev, [chatId]: true}));

            // Try to fetch suggestions for this chat
            try {
                const suggestions = await ChatApi.getChatSuggestions(chatId);
                if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
                    console.log(`Fetched ${suggestions.length} suggestions for chat ${chatId}`);

                    // Transform suggestions into the expected format with icons
                    const formattedSuggestions = suggestions.map((text, index) => ({
                        id: `suggestion-${Date.now()}-${index}`,
                        text,
                        icon: getIconForSuggestion(text) // Using your existing icon detection function
                    }));

                    // Set these as input suggestions or update the WebSocket context
                    setInputSuggestions(formattedSuggestions);
                }
            } catch (suggestionError) {
                console.warn("Error fetching suggestions:", suggestionError);
                // Non-critical error, continue with chat loading
            }

            setChatHistory((prev) =>
                prev.map((chat) => {
                    if (chat.id === chatId) {
                        // If chat has suggestions, store them
                        const updatedChat = {
                            ...chat,
                            messages: messageResponse.items
                        };

                        return updatedChat;
                    }
                    return chat;
                })
            );

            return messageResponse.items;
        } catch (err) {
            console.error(`Error loading chat ${chatId}:`, err);
            setError("Failed to load chat messages. Please try again later.");
            return [];
        }
    };

    const createNewChat = async () => {
        try {
            setError(null);
            const newChat = await ChatApi.createChat({ title: "Новый чат" });
            setChatHistory((prev) => [...prev, newChat]);
            setActiveChat(newChat.id);
            setSidebarOpen(false);

            // Mark as messages loaded (even though it's empty)
            setMessagesLoaded(prev => ({...prev, [newChat.id]: true}));

            // Connect to WebSocket for the new chat
            connectWebSocket(newChat.id);
        } catch (err) {
            console.error("Error creating new chat:", err);
            setError("Failed to create new chat. Please try again later.");
        }
    };

    const handleChatSelect = async (chatId: string) => {
        if (activeChat === chatId) return;

        // Disconnect from current WebSocket connection first
        if (activeChat && isConnected) {
            disconnectWebSocket();
        }

        setActiveChat(chatId);
        setSidebarOpen(false);

        // Clear suggestions when switching chats
        clearSuggestions();

        // Load messages first before connecting to WebSocket
        const messages = await loadChat(chatId);

        // Check if there's an in-progress message
        const hasInProgressMessage = messages.some(msg =>
            msg.message_type === "ai" &&
            (msg.status === MessageStatus.PENDING || msg.status === MessageStatus.PROCESSING)
        );

        // Connect to WebSocket to receive updates - pass false to indicate this is not a new chat
        connectWebSocket(chatId, false);
    };

    const generateRelevantSuggestions = (message: string) => {
        const registrationKeywords = ["регистрация", "зарегистрироваться", "аккаунт", "создать"];
        const techSupportKeywords = ["ошибка", "проблема", "не работает", "техническая"];
        const procurementKeywords = ["закупка", "поставка", "тендер", "аукцион", "оферта"];
        const lowercaseMessage = message.toLowerCase();
        if (registrationKeywords.some((keyword) => lowercaseMessage.includes(keyword))) {
            setInputSuggestions([
                { id: `sug-reg-1-${Date.now()}`, text: "Какие документы нужны для регистрации?", icon: "file-text" },
                { id: `sug-reg-2-${Date.now()}`, text: "Как долго рассматривается заявка?", icon: "help-circle" },
                { id: `sug-reg-3-${Date.now()}`, text: "Что делать если отклонили заявку?", icon: "alert-triangle" },
            ]);
            return;
        }
        if (techSupportKeywords.some((keyword) => lowercaseMessage.includes(keyword))) {
            setInputSuggestions([
                { id: `sug-tech-1-${Date.now()}`, text: "Не загружаются документы", icon: "alert-triangle" },
                { id: `sug-tech-2-${Date.now()}`, text: "Как сбросить пароль?", icon: "help-circle" },
                { id: `sug-tech-3-${Date.now()}`, text: "Не приходят уведомления", icon: "alert-triangle" },
            ]);
            return;
        }
        if (procurementKeywords.some((keyword) => lowercaseMessage.includes(keyword))) {
            setInputSuggestions([
                { id: `sug-proc-1-${Date.now()}`, text: "Как найти актуальные закупки?", icon: "search" },
                { id: `sug-proc-2-${Date.now()}`, text: "Что такое котировочная сессия?", icon: "help-circle" },
                { id: `sug-proc-3-${Date.now()}`, text: "Как подать заявку на участие?", icon: "file-text" },
            ]);
            return;
        }
        setInputSuggestions([]);
    };

    const deduplicateAndSortMessages = useCallback((messages: ChatMessage[] = []) => {
        const uniqueMessages = new Map<string, ChatMessage>();
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

    const handleSendMessage = async (message: string, files?: File[]) => {
        if ((!message || !message.trim()) && (!files || files.length === 0)) return;

        try {
            setError(null);
            console.log(`Sending message: "${message}" with ${files?.length || 0} files`);
            let fileIds: string[] = [];
            let fileReferences: any[] = [];

            // Handle file uploads
            if (files && files.length > 0) {
                try {
                    setFileUploadProgress(0);
                    console.log("Uploading files...");

                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const onProgress = (progress: number) => {
                            setFileUploadProgress(Math.round((i / files.length) * 100 + progress / files.length));
                        };

                        try {
                            const uploadedFile = await FileApi.uploadFile(file, onProgress);
                            fileIds.push(uploadedFile.id);
                            fileReferences.push({
                                id: uploadedFile.id,
                                name: uploadedFile.name || file.name,
                                file_type: uploadedFile.file_type || FileType.OTHER,
                                preview_url: uploadedFile.preview_url,
                            });
                        } catch (fileError) {
                            console.error(`Error uploading file ${file.name}:`, fileError);
                        }
                    }

                    setFileUploadProgress(null);
                } catch (error) {
                    console.error("Error uploading files:", error);
                    setError("Failed to upload files. Please try again.");
                    setFileUploadProgress(null);
                    return;
                }
            }

            // Create new chat or use existing chat
            if (!activeChat) {
                console.log("Creating new chat...");
                const chatTitle = message.length > 20 ? message.substring(0, 20) + "..." : message;
                const newChat = await ChatApi.createChat({ title: chatTitle });
                console.log(`New chat created: ${newChat.id}`);

                // Add to chat history immediately to prevent duplication
                setChatHistory(prev => {
                    // Check if chat with this ID already exists
                    if (prev.some(c => c.id === newChat.id)) {
                        return prev;
                    }
                    return [...prev, newChat];
                });

                setActiveChat(newChat.id);
                setMessagesLoaded(prev => ({...prev, [newChat.id]: true}));
                connectWebSocket(newChat.id);

                // Wait for connection to establish
                await new Promise(resolve => setTimeout(resolve, 500));
                await sendMessageToChat(newChat.id, message, fileIds, fileReferences);
            } else {
                console.log(`Sending to existing chat: ${activeChat}`);
                await sendMessageToChat(activeChat, message, fileIds, fileReferences);
            }

            generateRelevantSuggestions(message);
            setSidebarOpen(false);
            setInputSuggestions([]);
        } catch (error) {
            console.error("Error sending message:", error);
            setError("Failed to send message. Please try again.");
            setFileUploadProgress(null);
        }
    };

    const sendMessageToChat = async (
        chatId: string,
        content: string,
        fileIds: string[] = [],
        fileReferences: any[] = []
    ) => {
        try {
            // Add optimistic message to UI
            const optimisticMessage: ChatMessage = {
                id: `temp-${Date.now()}`,
                chat_id: chatId,
                content,
                message_type: "USER",
                status: MessageStatus.COMPLETED,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                files: fileReferences.length > 0 ? fileReferences : undefined,
            };

            setChatHistory((prev) =>
                prev.map((chat) => {
                    if (chat.id === chatId) {
                        const existingMessages = chat.messages || [];
                        // Use the shared helper function
                        const updatedMessages = deduplicateAndSortMessages([...existingMessages, optimisticMessage]);

                        const updatedChat = {
                            ...chat,
                            messages: updatedMessages,
                            updated_at: new Date().toISOString(),
                        };

                        if (chat.title === "Новый чат" && !existingMessages.length) {
                            updatedChat.title =
                                content.length > 20 ? content.substring(0, 20) + "..." : content;
                        }
                        return updatedChat;
                    }
                    return chat;
                })
            );

            // Send actual message to API
            await ChatApi.sendMessage(chatId, {
                content,
                file_ids: fileIds.length > 0 ? fileIds : undefined,
            });
        } catch (error) {
            console.error(`Error sending message to chat ${chatId}:`, error);
            throw error; // Rethrow error to be caught by handleSendMessage
        }
    };

    const handleMessageReaction = async (messageId: string, reaction: "like" | "dislike") => {
        if (!activeChat) return;

        // Prevent duplicate reactions
        const chatIndex = chatHistory.findIndex(chat => chat.id === activeChat);
        if (chatIndex === -1) return;

        const messageIndex = chatHistory[chatIndex].messages?.findIndex(msg => msg.id === messageId) ?? -1;
        if (messageIndex === -1) return;

        const message = chatHistory[chatIndex].messages?.[messageIndex];
        const hasExistingReaction = message?.reactions?.some(
            r => r.reaction_type.toLowerCase() === reaction.toUpperCase()
        );

        if (hasExistingReaction) {
            // If already has this reaction, we'll remove it
            console.log(`Removing ${reaction} reaction from message ${messageId}`);
        }

        try {
            setError(null);
            const apiReaction = reaction.toUpperCase() as ReactionType;

            // Optimistic update of UI
            setChatHistory((prevHistory) =>
                prevHistory.map((chat) => {
                    if (chat.id === activeChat) {
                        return {
                            ...chat,
                            messages: (chat.messages || []).map((msg) => {
                                if (msg.id === messageId) {
                                    // Clear existing reactions
                                    const newReactions = hasExistingReaction
                                        ? []
                                        : [
                                            {
                                                id: `temp-${Date.now()}`,
                                                message_id: messageId,
                                                reaction_type: apiReaction,
                                                created_at: new Date().toISOString(),
                                            },
                                        ];
                                    return { ...msg, reactions: newReactions };
                                }
                                return msg;
                            }),
                        };
                    }
                    return chat;
                })
            );

            // Send actual reaction to API with retry
            let retryCount = 0;
            const maxRetries = 2;
            let success = false;

            while (!success && retryCount <= maxRetries) {
                try {
                    await ChatApi.addReaction(activeChat, messageId, {
                        reaction_type: apiReaction,
                    });
                    success = true;
                } catch (error) {
                    console.error(`Error adding reaction (attempt ${retryCount + 1}):`, error);
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        // Wait before retrying
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        throw error; // Rethrow if all retries failed
                    }
                }
            }
        } catch (error) {
            console.error(`Error adding reaction to message ${messageId}:`, error);
            setError("Failed to add reaction. Please try again.");
            // Refresh the chat to ensure UI is in sync with server
            loadChat(activeChat);
        }
    };

    const handleRequestSupport = async () => {
        try {
            setError(null);

            // Get the target chat ID
            let targetChatId = activeChat;

            if (!targetChatId) {
                // Create a new chat if none is active
                const newChat = await ChatApi.createChat({ title: "Запрос поддержки" });
                setChatHistory(prev => [...prev, newChat]);
                targetChatId = newChat.id;
                setActiveChat(targetChatId);
                setMessagesLoaded(prev => ({...prev, [targetChatId]: true}));
                connectWebSocket(targetChatId);
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for connection
            }

            // Send the user message first
            await sendMessageToChat(targetChatId, "Я хотел бы подключиться к оператору поддержки.");

            // Create optimistic system message first for UI responsiveness
            const optimisticSystemMessage: ChatMessage = {
                id: `temp-system-${Date.now()}`,
                chat_id: targetChatId,
                content: "Запрос на соединение с оператором отправлен. Пожалуйста, ожидайте, оператор присоединится к чату в ближайшее время.",
                message_type: "SYSTEM",
                status: MessageStatus.COMPLETED,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // Add optimistic system message to chat history
            setChatHistory(prevHistory =>
                prevHistory.map(chat => {
                    if (chat.id === targetChatId) {
                        // Check if this system message already exists to avoid duplicates
                        const hasSimilarSystemMessage = (chat.messages || []).some(
                            msg =>
                                (msg.message_type === "SYSTEM" || msg.message_type === "system") &&
                                msg.content.includes("Запрос на соединение с оператором")
                        );

                        if (hasSimilarSystemMessage) {
                            return chat; // Don't add duplicate system messages
                        }

                        const existingMessages = chat.messages || [];
                        const updatedMessages = deduplicateAndSortMessages([...existingMessages, optimisticSystemMessage]);

                        return {
                            ...chat,
                            messages: updatedMessages,
                            updated_at: new Date().toISOString(),
                        };
                    }
                    return chat;
                })
            );

            // Create and send actual system message
            try {
                const systemMessage = await ChatApi.sendSystemMessage(targetChatId, {
                    content: "Запрос на соединение с оператором отправлен. Пожалуйста, ожидайте, оператор присоединится к чату в ближайшее время.",
                    message_type: "SYSTEM"
                });

                console.log('System message created:', systemMessage);

                // Replace optimistic system message with real one
                setChatHistory(prevHistory =>
                    prevHistory.map(chat => {
                        if (chat.id === targetChatId) {
                            return {
                                ...chat,
                                messages: (chat.messages || []).map(msg =>
                                    msg.id === optimisticSystemMessage.id ? systemMessage : msg
                                ),
                                updated_at: new Date().toISOString(),
                            };
                        }
                        return chat;
                    })
                );
            } catch (error) {
                console.error("Error sending system message:", error);
                // Keep the optimistic message - no need to remove it
            }
        } catch (error) {
            console.error("Error requesting support:", error);
            setError("Failed to request support. Please try again.");
        }
    };

    const handleSuggestionClick = (text: string) => {
        handleSendMessage(text);
    };

    // Load chats when the component mounts
    useEffect(() => {
        if (user) {
            loadChats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Load chat and connect to WebSocket when activeChat changes
    useEffect(() => {
        if (activeChat) {
            // Check if messages are already loaded for this chat
            const hasLoadedMessages = messagesLoaded[activeChat];

            if (!hasLoadedMessages) {
                loadChat(activeChat).then(() => {
                    connectWebSocket(activeChat);
                });
            } else {
                connectWebSocket(activeChat);
            }
        }

        // Cleanup function to disconnect WebSocket when changing chats
        return () => {
            if (activeChat && isConnected) {
                disconnectWebSocket();
            }
        };
    }, [activeChat, isConnected, messagesLoaded]);

    // Update chat history when a message is completed
    useEffect(() => {
        if (lastCompletedMessage && activeChat && isConnected) {
            console.log("Processing completed message:", lastCompletedMessage.id, "for active chat:", activeChat);
            setChatHistory((prevHistory) =>
                prevHistory.map((chat) => {
                    if (chat.id === activeChat) {
                        const existingMessages = chat.messages || [];
                        const newMessage: ChatMessage = {
                            id: lastCompletedMessage.id,
                            chat_id: activeChat,
                            content: lastCompletedMessage.content,
                            message_type: "ai",
                            status: MessageStatus.COMPLETED,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            sources: [],
                            reactions: [],
                            files: [],
                        };

                        // Add/Update the message using the helper function
                        const updatedMessages = deduplicateAndSortMessages([...existingMessages, newMessage]);

                        return {
                            ...chat,
                            messages: updatedMessages,
                            updated_at: new Date().toISOString(),
                        };
                    }
                    return chat;
                })
            );

            // Move the active chat to the top of the list
            setChatHistory(prev => {
                const updatedChat = prev.find(chat => chat.id === activeChat);
                if (!updatedChat) return prev;
                const otherChats = prev.filter(chat => chat.id !== activeChat);
                return [updatedChat, ...otherChats];
            });

            // Clear the processed message from the context state
            clearLastCompletedMessage();
        }
    }, [lastCompletedMessage, activeChat, isConnected, deduplicateAndSortMessages, clearLastCompletedMessage]);

    // Set mounted state
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    // Determine if the current state represents a new, empty chat
    const isEffectivelyNewChat = !activeChat || (currentChat && (!currentChat.messages || currentChat.messages.length === 0) && !isTyping && !pendingMessageId);

    // Decide which suggestions to show in the input
    const suggestionsForInput = chatSuggestions.length > 0
        ? chatSuggestions // Prioritize AI suggestions from context if they exist
        : isEffectivelyNewChat
            ? initialSuggestions // Fallback to default suggestions for a new/empty chat state
            : []; // Otherwise, no suggestions (e.g., existing chat without AI suggestions yet)

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Error notification */}
            {error && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded w-full max-w-md flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-4 text-red-700 hover:text-red-900">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* File upload progress overlay */}
            {fileUploadProgress !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-medium mb-4">Загрузка файлов</h3>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${fileUploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {fileUploadProgress}% загружено...
                        </p>
                    </div>
                </div>
            )}

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-20 border-b border-gray-200 dark:border-gray-700 bg-background p-4 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="flex md:hidden">
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </Button>
                <h1 className="text-lg font-semibold truncate">
                    {currentChat ? currentChat.title : "Портал Поставщиков - Чат"}
                </h1>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button variant="ghost" size="icon" onClick={logout} title="Выйти">
                        <LogOut size={20} />
                    </Button>
                </div>
            </div>

            {/* Sidebar */}
            <div
                className={cn(
                    "fixed inset-0 z-10 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-72 border-r border-gray-200 dark:border-gray-700 bg-background md:bg-muted/30 flex flex-col",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <ChatSidebar
                    chats={chatHistory}
                    activeChat={activeChat || ""}
                    onChatSelect={handleChatSelect}
                    onNewChat={createNewChat}
                    sidebarOpen={sidebarOpen}
                    onCloseSidebar={() => setSidebarOpen(false)}
                    isLoading={isLoadingChats}
                    user={user}
                    onLogout={logout}
                />
            </div>

            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-[5] md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col pt-14 md:pt-0">
                {/* Desktop Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 p-4 hidden md:flex md:justify-between md:items-center">
                    <h1 className="text-xl font-semibold">
                        {currentChat ? currentChat.title : "Портал Поставщиков - Чат"}
                    </h1>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Button variant="ghost" size="icon" onClick={logout} title="Выйти">
                            <LogOut size={20} />
                        </Button>
                    </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 flex flex-col min-h-0">
                    <MessageManager
                        currentChat={currentChat}
                        isLoadingChats={isLoadingChats}
                        isTyping={isTyping}
                        pendingMessageId={pendingMessageId}
                        streamedContent={streamedContent}
                        onMessageReaction={handleMessageReaction}
                        onSuggestionClick={handleSuggestionClick}
                    />
                </div>

                {/* Chat Input - Fixed at bottom */}
                <div className="flex-shrink-0">
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        onRequestSupport={handleRequestSupport}
                        isLoading={isLoadingChats}
                        isTyping={isTyping}
                        isUploading={fileUploadProgress !== null}
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