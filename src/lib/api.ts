import {
    LoginRequest,
    LoginResponse,
    SignupRequest,
    SignupResponse,
    User,
    Chat,
    ChatMessage,
    FileUploadResponse,
    CreateChatRequest,
    SendMessageRequest
} from "./types";

// API constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

// Helper to get JWT token
const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('jwt_token');
    }
    return null;
};

// Helper to add auth header to requests
const getAuthHeaders = (): HeadersInit => {
    const token = getToken();
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
};

// Handle API errors
const handleApiResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Произошла ошибка при обработке запроса');
    }
    return response.json() as Promise<T>;
};

// Authentication API
export const authApi = {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleApiResponse<LoginResponse>(response);
    },

    signup: async (data: SignupRequest): Promise<SignupResponse> => {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleApiResponse<SignupResponse>(response);
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: getAuthHeaders(),
        });
        return handleApiResponse<User>(response);
    },
};

// Chats API
export const chatApi = {
    getChats: async (): Promise<Chat[]> => {
        const response = await fetch(`${API_BASE_URL}/chats`, {
            headers: getAuthHeaders(),
        });
        return handleApiResponse<Chat[]>(response);
    },

    getChat: async (chatId: string): Promise<Chat> => {
        const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
            headers: getAuthHeaders(),
        });
        return handleApiResponse<Chat>(response);
    },

    createChat: async (data: CreateChatRequest): Promise<Chat> => {
        const response = await fetch(`${API_BASE_URL}/chats`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleApiResponse<Chat>(response);
    },

    sendMessage: async (data: SendMessageRequest): Promise<ChatMessage> => {
        const response = await fetch(`${API_BASE_URL}/chats/${data.chatId}/messages`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content: data.content, attachments: data.attachments }),
        });
        return handleApiResponse<ChatMessage>(response);
    },

    reactToMessage: async (chatId: string, messageId: string, reaction: 'like' | 'dislike'): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/${messageId}/reaction`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ reaction }),
        });
        return handleApiResponse<void>(response);
    },
};

// File upload API
export const fileApi = {
    uploadFile: async (file: File): Promise<FileUploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);

        const token = getToken();
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/files/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });
        return handleApiResponse<FileUploadResponse>(response);
    },

    uploadMultipleFiles: async (files: File[]): Promise<FileUploadResponse[]> => {
        const formData = new FormData();
        files.forEach((file, index) => {
            formData.append(`files`, file);
        });

        const token = getToken();
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/files/upload-multiple`, {
            method: 'POST',
            headers,
            body: formData,
        });
        return handleApiResponse<FileUploadResponse[]>(response);
    },
};

// WebSocket chat connection
export const createChatWebSocket = (chatId: string, onMessage: (message: string) => void) => {
    const token = getToken();
    if (!token) {
        throw new Error('Authentication required');
    }

    const ws = new WebSocket(`${WS_BASE_URL}/chat/${chatId}?token=${token}`);

    ws.onopen = () => {
        console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
        onMessage(event.data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
    };

    return {
        close: () => ws.close(),
    };
};