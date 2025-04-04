"use client";

import React, { useState, useEffect, useRef } from "react";
import { Moon, Sun, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ChatSuggestions } from "./chat-suggestions";
import { useAuth } from "@/contexts/auth-context";
import {
    Chat,
    ChatMessage as ChatMessageType,
    MessageType,
    MessageStatus,
    WebSocketMessage,
    MessageChunk,
    MessageComplete,
    MessageSuggestion,
    ReactionType,
    FileType
} from "@/lib/types";
import { ChatApi } from "@/lib/chat-api";
import { FileApi } from "@/lib/file-api";
import { WebSocketService } from "@/lib/websocket-service";

// Default suggestions for new users
const DEFAULT_SUGGESTIONS: MessageSuggestion[] = [
    {
        id: "default-sug-1",
        text: "Как зарегистрироваться на портале?",
        icon: "user-plus",
    },
    {
        id: "default-sug-2",
        text: "Как найти активные закупки?",
        icon: "search",
    },
    {
        id: "default-sug-3",
        text: "Что такое котировочная сессия?",
        icon: "help-circle",
    },
    {
        id: "default-sug-4",
        text: "Как подать заявку на участие?",
        icon: "file-text",
    },
    {
        id: "default-sug-5",
        text: "Технические проблемы с входом",
        icon: "alert-triangle",
    },
];

export default function ChatApp() {
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [streamedText, setStreamedText] = useState("");
    const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<Chat[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [chatSuggestions, setChatSuggestions] = useState<MessageSuggestion[]>(DEFAULT_SUGGESTIONS);
    const [inputSuggestions, setInputSuggestions] = useState<MessageSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [fileUploadProgress, setFileUploadProgress] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const webSocketRef = useRef<WebSocketService | null>(null);

    // Find the current active chat object
    const currentChat = activeChat
        ? chatHistory.find(chat => chat.id === activeChat)
        : null;

    // Toggle theme function
    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    // Load all chats for the user
    const loadChats = async () => {
        try {
            setIsLoadingChats(true);
            setError(null);

            const response = await ChatApi.getChats();
            setChatHistory(response.items);

            // If there are no chats, we'll show default suggestions
            // If there are chats, select the most recent one
            if (response.items.length > 0 && !activeChat) {
                // Sort by updated_at date to get the most recent
                const sortedChats = [...response.items].sort((a, b) =>
                    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                );
                setActiveChat(sortedChats[0].id);
            }
        } catch (err) {
            console.error('Error loading chats:', err);
            setError('Failed to load chats. Please try again later.');
        } finally {
            setIsLoadingChats(false);
        }
    };

    // Load a specific chat with all messages
    const loadChat = async (chatId: string) => {
        try {
            setError(null);

            // Find the chat in existing history
            const existingChat = chatHistory.find(c => c.id === chatId);

            // If the chat exists but has no messages, fetch them
            if (existingChat && !existingChat.messages?.length) {
                const messageResponse = await ChatApi.getChatMessages(chatId);

                // Update the chat in history with messages
                setChatHistory(prev =>
                    prev.map(chat =>
                        chat.id === chatId
                            ? { ...chat, messages: messageResponse.items }
                            : chat
                    )
                );
            }
        } catch (err) {
            console.error(`Error loading chat ${chatId}:`, err);
            setError('Failed to load chat messages. Please try again later.');
        }
    };

    // Create a new chat
    const createNewChat = async () => {
        try {
            setError(null);

            const newChat = await ChatApi.createChat({
                title: "Новый чат"
            });

            setChatHistory(prev => [...prev, newChat]);
            setActiveChat(newChat.id);
            setSidebarOpen(false);

            // Establish WebSocket connection
            connectWebSocket(newChat.id);
        } catch (err) {
            console.error('Error creating new chat:', err);
            setError('Failed to create new chat. Please try again later.');
        }
    };

    // Handle selecting a chat
    const handleChatSelect = (chatId: string) => {
        // Close current WebSocket connection
        if (webSocketRef.current) {
            webSocketRef.current.disconnect();
            webSocketRef.current = null;
        }

        setActiveChat(chatId);
        setSidebarOpen(false);

        // Reset streaming state
        setIsTyping(false);
        setStreamedText("");
        setPendingMessageId(null);

        // Load chat messages if needed
        loadChat(chatId);

        // Establish new WebSocket connection
        connectWebSocket(chatId);
    };

    // Connect to WebSocket
    const connectWebSocket = (chatId: string) => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            console.error('No token found for WebSocket connection');
            setError("Authentication error. Please log in again.");
            return;
        }

        console.log(`Setting up WebSocket connection for chat ${chatId}`);

        // Clean up existing connection
        if (webSocketRef.current) {
            console.log('Disconnecting existing WebSocket');
            webSocketRef.current.disconnect();
            webSocketRef.current = null;
        }

        // Create new WebSocket connection
        const ws = new WebSocketService(chatId, token);

        // Add message listener
        ws.addMessageListener(handleWebSocketMessage);

        // Add connection listener
        ws.addConnectionListener(() => {
            console.log('WebSocket connected successfully');
            // You could update UI to show connected status here
        });

        // Add error listener
        ws.addErrorListener((error) => {
            console.error('WebSocket error:', error);
            if (error.message) {
                setError(`Connection error: ${error.message}`);
            }
        });

        // Connect
        console.log('Initiating WebSocket connection');
        ws.connect();

        // Save to ref
        webSocketRef.current = ws;
    };

    // Handle WebSocket message
    const handleWebSocketMessage = (message: WebSocketMessage) => {
        console.log('Received WebSocket message:', message);

        if (!message.type) {
            console.warn('Received message without type:', message);
            return;
        }

        if (message.type === 'chunk') {
            const chunkMessage = message as MessageChunk;
            handleMessageChunk(chunkMessage);
        } else if (message.type === 'complete') {
            const completeMessage = message as MessageComplete;
            handleMessageComplete(completeMessage);
        } else if (message.type === 'error') {
            console.error('WebSocket error message:', message);
            setError(message.detail || 'Error in chat connection');
        } else if (message.type === 'stream_content') {
            // Handle stream_content type (used by some WebSocket implementations)
            if (message.content && message.message_id) {
                handleMessageChunk({
                    type: 'chunk',
                    message_id: message.message_id,
                    content: message.content
                });
            }
        } else {
            console.log('Unhandled message type:', message.type);
        }
    };

    // Handle message chunk from WebSocket
    const handleMessageChunk = (message: MessageChunk) => {
        console.log('Handling message chunk for message ID:', message.message_id);

        // If we're not already typing, set typing state
        if (!isTyping) {
            setIsTyping(true);
            setPendingMessageId(message.message_id);
            setStreamedText("");
        }

        // Append chunk to streamed text
        setStreamedText(prev => prev + message.content);
    };

    // Handle complete message from WebSocket
    const handleMessageComplete = (message: MessageComplete) => {
        console.log('Message complete for message ID:', message.message_id);

        // Reset typing state
        setIsTyping(false);
        setStreamedText("");
        setPendingMessageId(null);

        // Get the latest message from API to ensure we have all data
        if (activeChat) {
            loadChat(activeChat);
        }
    };

    // Generate relevant input suggestions based on user's message
    const generateRelevantSuggestions = (message: string) => {
        // In a real app, these would come from an API based on the message content
        // For now, we'll use some simple keyword matching like the mock
        const registrationKeywords = ['регистрация', 'зарегистрироваться', 'аккаунт', 'создать'];
        const techSupportKeywords = ['ошибка', 'проблема', 'не работает', 'техническая'];
        const procurementKeywords = ['закупка', 'поставка', 'тендер', 'аукцион', 'оферта'];

        const lowercaseMessage = message.toLowerCase();

        // Check for registration related queries
        if (registrationKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
            setInputSuggestions([
                {
                    id: `sug-reg-1-${Date.now()}`,
                    text: "Какие документы нужны для регистрации?",
                    icon: "file-text"
                },
                {
                    id: `sug-reg-2-${Date.now()}`,
                    text: "Как долго рассматривается заявка?",
                    icon: "help-circle"
                },
                {
                    id: `sug-reg-3-${Date.now()}`,
                    text: "Что делать если отклонили заявку?",
                    icon: "alert-triangle"
                }
            ]);
            return;
        }

        // Check for technical support queries
        if (techSupportKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
            setInputSuggestions([
                {
                    id: `sug-tech-1-${Date.now()}`,
                    text: "Не загружаются документы",
                    icon: "alert-triangle"
                },
                {
                    id: `sug-tech-2-${Date.now()}`,
                    text: "Как сбросить пароль?",
                    icon: "help-circle"
                },
                {
                    id: `sug-tech-3-${Date.now()}`,
                    text: "Не приходят уведомления",
                    icon: "alert-triangle"
                }
            ]);
            return;
        }

        // Check for procurement related queries
        if (procurementKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
            setInputSuggestions([
                {
                    id: `sug-proc-1-${Date.now()}`,
                    text: "Как найти актуальные закупки?",
                    icon: "search"
                },
                {
                    id: `sug-proc-2-${Date.now()}`,
                    text: "Что такое котировочная сессия?",
                    icon: "help-circle"
                },
                {
                    id: `sug-proc-3-${Date.now()}`,
                    text: "Как подать заявку на участие?",
                    icon: "file-text"
                }
            ]);
            return;
        }

        // Default to empty suggestions if no keywords match
        setInputSuggestions([]);
    };

    // Helper function to get word form for files
    const getFileWord = (count: number): string => {
        if (count === 1) return 'файл';
        if (count >= 2 && count <= 4) return 'файла';
        return 'файлов';
    };

    // Get file type based on MIME type and file extension
    const getFileTypeFromFile = (file: File): FileType => {
        if (file.type.startsWith('image/')) {
            return FileType.IMAGE;
        } else if (file.type === 'application/pdf') {
            return FileType.PDF;
        } else if (file.type.startsWith('text/') ||
            file.type === 'application/json' ||
            file.name.endsWith('.md') ||
            file.name.endsWith('.txt')) {
            return FileType.TEXT;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword') {
            return FileType.WORD;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel' ||
            file.name.endsWith('.csv')) {
            return FileType.EXCEL;
        } else {
            return FileType.OTHER;
        }
    };

    // Handle sending a message with files
    const handleSendMessage = async (message: string, files?: File[]) => {
        // Don't send empty messages
        if (!message.trim() && (!files || files.length === 0)) {
            return;
        }

        try {
            setError(null);
            console.log("Sending message:", message, "with files:", files?.length || 0);

            // Upload files if any
            let fileIds: string[] = [];
            let fileReferences: any[] = [];

            if (files && files.length > 0) {
                try {
                    setFileUploadProgress(0);
                    console.log("Uploading files...");

                    // Upload each file individually to have better control and error handling
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        console.log(`Uploading file ${i+1}/${files.length}: ${file.name}`);

                        // Track upload progress for this file
                        const onProgress = (progress: number) => {
                            setFileUploadProgress(Math.round((i / files.length) * 100 + progress / files.length));
                        };

                        try {
                            const uploadedFile = await FileApi.uploadFile(file, onProgress);
                            fileIds.push(uploadedFile.id);
                            fileReferences.push({
                                id: uploadedFile.id,
                                name: uploadedFile.name || file.name,
                                file_type: uploadedFile.file_type || getFileTypeFromFile(file),
                                preview_url: uploadedFile.preview_url
                            });
                            console.log(`File ${i+1} uploaded successfully:`, uploadedFile);
                        } catch (fileError) {
                            console.error(`Error uploading file ${file.name}:`, fileError);
                            // Continue with other files even if one fails
                        }
                    }

                    console.log("All files uploaded. File IDs:", fileIds);
                    setFileUploadProgress(null);
                } catch (error) {
                    console.error("Error uploading files:", error);
                    setError("Failed to upload files. Please try again.");
                    setFileUploadProgress(null);
                    return;
                }
            }

            // If there's no active chat, create one
            if (!activeChat) {
                console.log("Creating new chat...");
                const chatTitle = message.length > 20
                    ? message.substring(0, 20) + '...'
                    : message;

                const newChat = await ChatApi.createChat({
                    title: chatTitle
                });

                console.log("New chat created:", newChat.id);
                setChatHistory(prev => [...prev, newChat]);
                setActiveChat(newChat.id);

                // Establish WebSocket connection for new chat
                connectWebSocket(newChat.id);

                // Add a slight delay to ensure connection is established
                await new Promise(resolve => setTimeout(resolve, 500));

                // Now send the message to the new chat
                await sendMessageToChat(newChat.id, message, fileIds, fileReferences);
            } else {
                // Send message to existing chat
                console.log("Sending to existing chat:", activeChat);
                await sendMessageToChat(activeChat, message, fileIds, fileReferences);
            }

            // Generate suggestions based on the message
            generateRelevantSuggestions(message);

            // Close sidebar on mobile after sending a message
            setSidebarOpen(false);

            // Reset input suggestions
            setInputSuggestions([]);

        } catch (error) {
            console.error("Error sending message:", error);
            setError("Failed to send message. Please try again.");
            setFileUploadProgress(null);
        }
    };

    // Send message to chat
    const sendMessageToChat = async (chatId: string, content: string, fileIds: string[] = [], fileReferences: any[] = []) => {
        try {
            console.log(`Sending message to chat ${chatId}:`, content);

            // Create optimistic user message update
            const optimisticMessage: ChatMessageType = {
                id: `temp-${Date.now()}`,
                chat_id: chatId,
                content,
                message_type: MessageType.USER,
                status: MessageStatus.COMPLETED,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                files: fileReferences.length > 0 ? fileReferences : undefined
            };

            // Update UI optimistically
            setChatHistory(prev =>
                prev.map(chat => {
                    if (chat.id === chatId) {
                        const updatedChat = {
                            ...chat,
                            messages: [...(chat.messages || []), optimisticMessage],
                            updated_at: new Date().toISOString()
                        };

                        // Update chat title if it's a new chat
                        if (chat.title === "Новый чат" && !chat.messages?.length) {
                            updatedChat.title = content.length > 20
                                ? content.substring(0, 20) + '...'
                                : content;
                        }

                        return updatedChat;
                    }
                    return chat;
                })
            );

            // Make sure WebSocket is connected before sending message
            if (webSocketRef.current && !webSocketRef.current.isConnected()) {
                console.log('WebSocket not connected, reconnecting...');
                connectWebSocket(chatId);
                // Wait a short time for connection to establish
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Send message to API
            console.log('Sending message to API with file IDs:', fileIds);
            const response = await ChatApi.sendMessage(chatId, {
                content,
                file_ids: fileIds.length > 0 ? fileIds : undefined
            });

            console.log('Message sent successfully, API response:', response);

            // Set typing state immediately to provide feedback
            // (even before we get the first WebSocket chunk)
            setIsTyping(true);
            setStreamedText("");

            // The backend will send the response via WebSocket
            // We'll handle that in the WebSocket message handlers

        } catch (error) {
            console.error(`Error sending message to chat ${chatId}:`, error);
            throw error;
        }
    };

    // Handle message reaction
    const handleMessageReaction = async (messageId: string, reaction: 'like' | 'dislike') => {
        if (!activeChat) return;

        try {
            setError(null);

            // Convert to the reaction type expected by the API
            const apiReaction = reaction.toUpperCase() as ReactionType;

            // Optimistic update
            setChatHistory(prevHistory =>
                prevHistory.map(chat => {
                    if (chat.id === activeChat) {
                        return {
                            ...chat,
                            messages: (chat.messages || []).map(msg => {
                                if (msg.id === messageId) {
                                    // Toggle reaction if it's the same
                                    const hasExistingReaction = msg.reactions?.some(r =>
                                        r.reaction_type === apiReaction
                                    );

                                    const newReactions = hasExistingReaction
                                        ? [] // Remove reaction if already exists
                                        : [{
                                            id: `temp-${Date.now()}`,
                                            message_id: messageId,
                                            reaction_type: apiReaction,
                                            created_at: new Date().toISOString()
                                        }];

                                    return {
                                        ...msg,
                                        reactions: newReactions
                                    };
                                }
                                return msg;
                            }),
                        };
                    }
                    return chat;
                })
            );

            // Send to API
            await ChatApi.addReaction(activeChat, messageId, {
                reaction_type: apiReaction
            });

        } catch (error) {
            console.error(`Error adding reaction to message ${messageId}:`, error);
            setError("Failed to add reaction. Please try again.");

            // Revert the optimistic update on error
            loadChat(activeChat);
        }
    };

    // Handle requesting support from a human operator
    const handleRequestSupport = async () => {
        try {
            setError(null);

            if (!activeChat) {
                // Create a new chat if none exists
                console.log("Creating new support chat");
                const newChat = await ChatApi.createChat({
                    title: "Запрос поддержки"
                });

                setChatHistory(prev => [...prev, newChat]);
                setActiveChat(newChat.id);

                // Establish WebSocket connection for new chat
                connectWebSocket(newChat.id);

                // Add a slight delay to ensure connection is established
                await new Promise(resolve => setTimeout(resolve, 500));

                // Send support request message to the new chat
                await sendMessageToChat(
                    newChat.id,
                    "Я хотел бы подключиться к оператору поддержки."
                );
            } else {
                // Send support request to existing chat
                console.log("Sending support request to existing chat:", activeChat);
                await sendMessageToChat(
                    activeChat,
                    "Я хотел бы подключиться к оператору поддержки."
                );
            }

            // Add system message to UI after a short delay (this would normally come from the backend)
            setTimeout(() => {
                setChatHistory(prevHistory =>
                    prevHistory.map(chat => {
                        if (chat.id === (activeChat || prevHistory[prevHistory.length - 1].id)) {
                            const systemMessage: ChatMessageType = {
                                id: `system-${Date.now()}`,
                                chat_id: chat.id,
                                content: "Запрос на соединение с оператором отправлен. Пожалуйста, ожидайте, оператор присоединится к чату в ближайшее время.",
                                message_type: MessageType.SYSTEM,
                                status: MessageStatus.COMPLETED,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            };

                            return {
                                ...chat,
                                messages: [...(chat.messages || []), systemMessage],
                                updated_at: new Date().toISOString()
                            };
                        }
                        return chat;
                    })
                );
            }, 1000);
        } catch (error) {
            console.error("Error requesting support:", error);
            setError("Failed to request support. Please try again.");
        }
    };

    // Handle suggestion click
    const handleSuggestionClick = (text: string) => {
        handleSendMessage(text);
    };

    // Load chats on initial render
    useEffect(() => {
        if (user) {
            loadChats();
        }
    }, [user]);

    // Handle active chat change
    useEffect(() => {
        if (activeChat) {
            loadChat(activeChat);
            connectWebSocket(activeChat);
        }
    }, [activeChat]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [currentChat?.messages, streamedText]);

    // Clean up WebSocket on unmount
    useEffect(() => {
        return () => {
            if (webSocketRef.current) {
                webSocketRef.current.disconnect();
            }
        };
    }, []);

    // Ensure theme toggle works correctly with SSR
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Error notification */}
            {error && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded w-full max-w-md flex justify-between items-center">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-4 text-red-700 hover:text-red-900"
                    >
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

            {/* Mobile Header with Burger Menu */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-20 border-b border-gray-200 dark:border-gray-700 bg-background p-4 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="flex md:hidden">
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </Button>
                <h1 className="text-lg font-semibold truncate">
                    {currentChat ? currentChat.title : "Портал Поставщиков - Чат"}
                </h1>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={toggleTheme}>
                        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={logout} title="Выйти">
                        <LogOut size={20} />
                    </Button>
                </div>
            </div>

            {/* Sidebar - Chat List */}
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

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[5] md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col pt-14 md:pt-0">
                {/* Chat Header - Desktop */}
                <div className="border-b border-gray-200 dark:border-gray-700 p-4 hidden md:flex md:justify-between md:items-center">
                    <h1 className="text-xl font-semibold">
                        {currentChat ? currentChat.title : "Портал Поставщиков - Чат"}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={toggleTheme}>
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={logout} title="Выйти">
                            <LogOut size={20} />
                        </Button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {isLoadingChats ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-pulse text-center">
                                <div className="h-6 w-32 bg-muted rounded mx-auto"></div>
                                <div className="mt-2 h-4 w-48 bg-muted rounded mx-auto"></div>
                            </div>
                        </div>
                    ) : !currentChat || !currentChat.messages || currentChat.messages.length === 0 ? (
                        <ChatSuggestions onSuggestionClick={handleSuggestionClick} />
                    ) : (
                        <>
                            {currentChat.messages.map((message) => (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    onReaction={handleMessageReaction}
                                />
                            ))}
                        </>
                    )}

                    {/* Streaming text */}
                    {isTyping && streamedText && activeChat && (
                        <div className="flex justify-start animate-fade-in mb-4">
                            <div className="max-w-[85%] sm:max-w-[80%] rounded-lg p-4 chat-bubble-assistant">
                                <div className="text-sm font-medium mb-2 flex justify-between items-center">
                                    <span>Ассистент</span>
                                    <span className="text-xs opacity-70">{new Date().toLocaleTimeString()}</span>
                                </div>
                                <div className="whitespace-pre-wrap">
                                    {streamedText}
                                    <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-blink"></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <ChatInput
                    onSendMessage={handleSendMessage}
                    onRequestSupport={handleRequestSupport}
                    isLoading={isLoadingChats}
                    isTyping={isTyping}
                    isUploading={fileUploadProgress !== null}
                    suggestions={inputSuggestions}
                    onSuggestionClick={handleSuggestionClick}
                />
            </div>
        </div>
    );
}