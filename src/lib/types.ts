// User types
export interface User {
    id: string;
    username: string;
    full_name: string | null;
    email: string;
    is_active: boolean;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
}

// Authentication types
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface SignupRequest {
    username: string;
    email: string;
    password: string;
    full_name?: string;
}

export interface SignupResponse {
    access_token: string;
    token_type: string;
    user: User;
}

// File types
export enum FileType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    PDF = "PDF",
    WORD = "WORD",
    EXCEL = "EXCEL",
    OTHER = "OTHER"
}

export interface FileData {
    id: string;
    name: string;
    original_name: string;
    file_type: FileType;
    mime_type: string;
    size: number;
    content?: string;
    preview_url?: string;
    user_id: string;
    path: string;
    created_at: string;
    updated_at: string;
}

export interface FileUploadResponse {
    id: string;
    name: string;
    original_name: string;
    file_type: FileType;
    mime_type: string;
    size: number;
    preview_url?: string;
}

export interface FileReference {
    id: string;
    name: string;
    file_type: string;
    preview_url?: string;
}

export interface FileList {
    items: FileData[];
    total: number;
}

// Message types - matching both possible casings
export enum MessageType {
    USER = "user", // Changed to lowercase to match API
    AI = "ai",     // Changed to lowercase to match API
    SYSTEM = "system"
}

// Define uppercase versions of the message types for comparison
export const MessageTypeUpper = {
    USER: "USER",
    AI: "AI",
    SYSTEM: "SYSTEM"
};

export enum MessageStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}

export enum ReactionType {
    LIKE = "LIKE",
    DISLIKE = "DISLIKE"
}

export interface Reaction {
    id: string;
    message_id: string;
    reaction_type: ReactionType;
    created_at: string;
}

export interface ReactionCreate {
    reaction_type: ReactionType;
}

export interface Source {
    id: string;
    message_id: string;
    title: string;
    url?: string;
    content?: string;
    created_at: string;
}

export interface ChatMessage {
    id: string;
    chat_id: string;
    content: string;
    message_type: string; // Changed to string to accept any case
    status: MessageStatus;
    created_at: string;
    updated_at: string;
    sources?: Source[];
    files?: FileReference[];
    reactions?: Reaction[];
}

export interface SendMessageRequest {
    content: string;
    file_ids?: string[];
}

export interface MessageList {
    items: ChatMessage[];
    total: number;
}

// Chat types
export interface Chat {
    id: string;
    title: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    messages?: ChatMessage[];
}

export interface ChatCreate {
    title: string;
}

export interface ChatList {
    items: Chat[];
    total: number;
}

// WebSocket message types
export interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

export interface MessageChunk extends WebSocketMessage {
    type: "chunk";
    message_id: string;
    content: string;
}

export interface MessageComplete extends WebSocketMessage {
    type: "complete";
    message_id: string;
    sources?: Source[];
}

export interface MessageSuggestion {
    id: string;
    text: string;
    icon: string;
}