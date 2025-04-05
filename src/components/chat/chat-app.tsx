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
    FileType,
} from "@/lib/types";
import { ChatApi } from "@/lib/chat-api";
import { FileApi } from "@/lib/file-api";
import { WebSocketService } from "@/lib/websocket-service";

// Default suggestions for new users
const DEFAULT_SUGGESTIONS: MessageSuggestion[] = [
    { id: "default-sug-1", text: "Как зарегистрироваться на портале?", icon: "user-plus" },
    { id: "default-sug-2", text: "Как найти активные закупки?", icon: "search" },
    { id: "default-sug-3", text: "Что такое котировочная сессия?", icon: "help-circle" },
    { id: "default-sug-4", text: "Как подать заявку на участие?", icon: "file-text" },
    { id: "default-sug-5", text: "Технические проблемы с входом", icon: "alert-triangle" },
];

export default function ChatApp() {
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [streamedText, setStreamedText] = useState("");
    const [displayedText, setDisplayedText] = useState("");
    const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<Chat[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [chatSuggestions, setChatSuggestions] = useState<MessageSuggestion[]>(DEFAULT_SUGGESTIONS);
    const [inputSuggestions, setInputSuggestions] = useState<MessageSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [fileUploadProgress, setFileUploadProgress] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const webSocketRef = useRef<WebSocketService | null>(null);

    const currentChat = activeChat
        ? chatHistory.find((chat) => chat.id === activeChat)
        : null;

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const loadChats = async () => {
        try {
            setIsLoadingChats(true);
            setError(null);
            const response = await ChatApi.getChats();
            setChatHistory(response.items);
            if (response.items.length > 0 && !activeChat) {
                const sortedChats = [...response.items].sort(
                    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                );
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
            const existingChat = chatHistory.find((c) => c.id === chatId);
            if (existingChat && !existingChat.messages?.length) {
                const messageResponse = await ChatApi.getChatMessages(chatId);
                setChatHistory((prev) =>
                    prev.map((chat) =>
                        chat.id === chatId ? { ...chat, messages: messageResponse.items } : chat
                    )
                );
            }
        } catch (err) {
            console.error(`Error loading chat ${chatId}:`, err);
            setError("Failed to load chat messages. Please try again later.");
        }
    };

    const createNewChat = async () => {
        try {
            setError(null);
            const newChat = await ChatApi.createChat({ title: "Новый чат" });
            setChatHistory((prev) => [...prev, newChat]);
            setActiveChat(newChat.id);
            setSidebarOpen(false);
            connectWebSocket(newChat.id);
        } catch (err) {
            console.error("Error creating new chat:", err);
            setError("Failed to create new chat. Please try again later.");
        }
    };

    const handleChatSelect = (chatId: string) => {
        if (webSocketRef.current) {
            webSocketRef.current.disconnect();
            webSocketRef.current = null;
        }
        setActiveChat(chatId);
        setSidebarOpen(false);
        setIsTyping(false);
        setStreamedText("");
        setDisplayedText("");
        setPendingMessageId(null);
        loadChat(chatId);
        connectWebSocket(chatId);
    };

    const connectWebSocket = (chatId: string) => {
        const token = localStorage.getItem("jwt_token");
        if (!token) {
            console.error("No token found for WebSocket connection");
            setError("Authentication error. Please log in again.");
            return;
        }
        console.log(`Setting up WebSocket connection for chat ${chatId}`);
        if (webSocketRef.current) {
            console.log("Disconnecting existing WebSocket");
            webSocketRef.current.disconnect();
            webSocketRef.current = null;
        }
        const ws = new WebSocketService(chatId, token);
        ws.addMessageListener(handleWebSocketMessage);
        ws.addConnectionListener(() => {
            console.log("WebSocket connected successfully");
        });
        ws.addErrorListener((error) => {
            console.error("WebSocket error:", error);
            if (error.message) {
                setError(`Connection error: ${error.message}`);
            }
        });
        console.log("Initiating WebSocket connection");
        ws.connect();
        webSocketRef.current = ws;
    };

    const handleWebSocketMessage = (message: WebSocketMessage) => {
        console.log("Received WebSocket message:", message);
        if (!message.type) {
            console.warn("Received message without type:", message);
            return;
        }
        if (message.type === "chunk") {
            const chunkMessage = message as MessageChunk;
            handleMessageChunk(chunkMessage);
        } else if (message.type === "complete") {
            const completeMessage = message as MessageComplete;
            handleMessageComplete(completeMessage);
        } else if (message.type === "error") {
            console.error("WebSocket error message:", message);
            setError(message.detail || "Error in chat connection");
        } else if (message.type === "stream_content") {
            if (message.content && message.message_id) {
                handleMessageChunk({
                    type: "chunk",
                    message_id: message.message_id,
                    content: message.content,
                });
            }
        } else {
            console.log("Unhandled message type:", message.type);
        }
    };

    // New handler for message chunks that accumulates text and does not replace it
    const handleMessageChunk = (message: MessageChunk) => {
        console.log("Handling message chunk for message ID:", message.message_id);
        if (!isTyping || pendingMessageId !== message.message_id) {
            // New message: reset the animation
            setIsTyping(true);
            setPendingMessageId(message.message_id);
            setStreamedText(message.content);
            setDisplayedText("");
        } else {
            // Same message: append the chunk
            setStreamedText((prev) => prev + message.content);
        }
    };

    // Typing animation effect – run continuously while isTyping is true
    useEffect(() => {
        if (isTyping) {
            const intervalId = setInterval(() => {
                setDisplayedText((prev) => {
                    if (prev.length < streamedText.length) {
                        return streamedText.slice(0, prev.length + 1);
                    }
                    return prev;
                });
            }, 5); // 5ms per character for faster typing
            return () => clearInterval(intervalId);
        }
    }, [isTyping, streamedText]);

    const handleMessageComplete = (message: MessageComplete) => {
        console.log("Message complete for message ID:", message.message_id);
        // Ensure that the full accumulated text is shown
        setDisplayedText(streamedText);
        setIsTyping(false);
        setPendingMessageId(null);
        if (activeChat) {
            loadChat(activeChat);
        }
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

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const getFileTypeFromFile = (file: File): FileType => {
        if (file.type.startsWith("image/")) return FileType.IMAGE;
        if (file.type === "application/pdf") return FileType.PDF;
        if (
            file.type.startsWith("text/") ||
            file.type === "application/json" ||
            file.name.endsWith(".md") ||
            file.name.endsWith(".txt")
        )
            return FileType.TEXT;
        if (
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.type === "application/msword"
        )
            return FileType.WORD;
        if (
            file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.type === "application/vnd.ms-excel" ||
            file.name.endsWith(".csv")
        )
            return FileType.EXCEL;
        return FileType.OTHER;
    };

    const handleSendMessage = async (message: string, files?: File[]) => {
        if (!message.trim() && (!files || files.length === 0)) return;
        try {
            setError(null);
            console.log(`Sending message: "${message}" with ${files?.length || 0} files`);
            let fileIds: string[] = [];
            let fileReferences: any[] = [];
            if (files && files.length > 0) {
                try {
                    setFileUploadProgress(0);
                    console.log("Uploading files...");
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        console.log(`Uploading file ${i + 1}/${files.length}: ${file.name} (${formatFileSize(file.size)})`);
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
                                preview_url: uploadedFile.preview_url,
                            });
                            console.log(`File ${i + 1} uploaded successfully: ${file.name} (ID: ${uploadedFile.id})`);
                        } catch (fileError) {
                            console.error(`Error uploading file ${file.name}:`, fileError);
                        }
                    }
                    console.log(`All files uploaded. File IDs: ${fileIds.join(", ")}`);
                    setFileUploadProgress(null);
                } catch (error) {
                    console.error("Error uploading files:", error);
                    setError("Failed to upload files. Please try again.");
                    setFileUploadProgress(null);
                    return;
                }
            }
            if (!activeChat) {
                console.log("Creating new chat...");
                const chatTitle = message.length > 20 ? message.substring(0, 20) + "..." : message;
                const newChat = await ChatApi.createChat({ title: chatTitle });
                console.log(`New chat created: ${newChat.id}`);
                setChatHistory((prev) => [...prev, newChat]);
                setActiveChat(newChat.id);
                connectWebSocket(newChat.id);
                await new Promise((resolve) => setTimeout(resolve, 500));
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
            console.log(`Sending message to chat ${chatId}:`, content);
            const optimisticMessage: ChatMessageType = {
                id: `temp-${Date.now()}`,
                chat_id: chatId,
                content,
                message_type: MessageType.USER,
                status: MessageStatus.COMPLETED,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                files: fileReferences.length > 0 ? fileReferences : undefined,
            };
            setChatHistory((prev) =>
                prev.map((chat) => {
                    if (chat.id === chatId) {
                        const updatedChat = {
                            ...chat,
                            messages: [...(chat.messages || []), optimisticMessage],
                            updated_at: new Date().toISOString(),
                        };
                        if (chat.title === "Новый чат" && !chat.messages?.length) {
                            updatedChat.title =
                                content.length > 20 ? content.substring(0, 20) + "..." : content;
                        }
                        return updatedChat;
                    }
                    return chat;
                })
            );
            if (webSocketRef.current && !webSocketRef.current.isConnected()) {
                console.log("WebSocket not connected, reconnecting...");
                connectWebSocket(chatId);
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            console.log("Sending message to API with file IDs:", fileIds);
            const response = await ChatApi.sendMessage(chatId, {
                content,
                file_ids: fileIds.length > 0 ? fileIds : undefined,
            });
            console.log("Message sent successfully, API response:", response);
            setIsTyping(true);
            setStreamedText("");
            setDisplayedText("");
        } catch (error) {
            console.error(`Error sending message to chat ${chatId}:`, error);
            throw error;
        }
    };

    const handleMessageReaction = async (messageId: string, reaction: "like" | "dislike") => {
        if (!activeChat) return;
        try {
            setError(null);
            const apiReaction = reaction.toUpperCase() as ReactionType;
            setChatHistory((prevHistory) =>
                prevHistory.map((chat) => {
                    if (chat.id === activeChat) {
                        return {
                            ...chat,
                            messages: (chat.messages || []).map((msg) => {
                                if (msg.id === messageId) {
                                    const hasExistingReaction = msg.reactions?.some(
                                        (r) => r.reaction_type === apiReaction
                                    );
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
            await ChatApi.addReaction(activeChat, messageId, {
                reaction_type: apiReaction,
            });
        } catch (error) {
            console.error(`Error adding reaction to message ${messageId}:`, error);
            setError("Failed to add reaction. Please try again.");
            loadChat(activeChat);
        }
    };

    const handleRequestSupport = async () => {
        try {
            setError(null);
            if (!activeChat) {
                console.log("Creating new support chat");
                const newChat = await ChatApi.createChat({ title: "Запрос поддержки" });
                setChatHistory((prev) => [...prev, newChat]);
                setActiveChat(newChat.id);
                connectWebSocket(newChat.id);
                await new Promise((resolve) => setTimeout(resolve, 500));
                await sendMessageToChat(newChat.id, "Я хотел бы подключиться к оператору поддержки.");
            } else {
                console.log("Sending support request to existing chat:", activeChat);
                await sendMessageToChat(activeChat, "Я хотел бы подключиться к оператору поддержки.");
            }
            setTimeout(() => {
                setChatHistory((prevHistory) =>
                    prevHistory.map((chat) => {
                        if (chat.id === (activeChat || prevHistory[prevHistory.length - 1].id)) {
                            const systemMessage: ChatMessageType = {
                                id: `system-${Date.now()}`,
                                chat_id: chat.id,
                                content:
                                    "Запрос на соединение с оператором отправлен. Пожалуйста, ожидайте, оператор присоединится к чату в ближайшее время.",
                                message_type: MessageType.SYSTEM,
                                status: MessageStatus.COMPLETED,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            };
                            return {
                                ...chat,
                                messages: [...(chat.messages || []), systemMessage],
                                updated_at: new Date().toISOString(),
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

    const handleSuggestionClick = (text: string) => {
        handleSendMessage(text);
    };

    useEffect(() => {
        if (user) {
            loadChats();
        }
    }, [user]);

    useEffect(() => {
        if (activeChat) {
            loadChat(activeChat);
            connectWebSocket(activeChat);
        }
    }, [activeChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [currentChat?.messages, streamedText, displayedText]);

    useEffect(() => {
        return () => {
            if (webSocketRef.current) {
                webSocketRef.current.disconnect();
            }
        };
    }, []);

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
                    <Button variant="ghost" size="icon" onClick={toggleTheme}>
                        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    </Button>
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
                                <ChatMessage key={message.id} message={message} onReaction={handleMessageReaction} />
                            ))}
                        </>
                    )}

                    {/* Streaming text with typing animation */}
                    {isTyping && pendingMessageId && (
                        <div className="flex justify-start animate-fade-in mb-4">
                            <div className="max-w-[85%] sm:max-w-[80%] rounded-lg p-4 chat-bubble-assistant">
                                <div className="text-sm font-medium mb-2 flex justify-between items-center">
                                    <span>Ассистент</span>
                                    <span className="text-xs opacity-70">{new Date().toLocaleTimeString()}</span>
                                </div>
                                <div className="whitespace-pre-wrap">
                                    {displayedText}
                                    <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-blink"></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
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
