import { AxiosError } from 'axios';
import { ApiService } from './api-service';
import {
    Chat,
    ChatCreate,
    ChatMessage,
    SendMessageRequest,
    ChatList,
    MessageList,
    ReactionCreate,
    MessageType
} from './types';

export class ChatApi {
    static async getChats(skip: number = 0, limit: number = 20): Promise<ChatList> {
        try {
            return await ApiService.get<ChatList>('/chats', { skip, limit });
        } catch (error) {
            console.error('Error fetching chats:', error);
            throw error;
        }
    }

    static async getChat(chatId: string): Promise<Chat> {
        try {
            return await ApiService.get<Chat>(`/chats/${chatId}`);
        } catch (error) {
            console.error(`Error fetching chat ${chatId}:`, error);
            throw error;
        }
    }

    static async createChat(chatData: ChatCreate): Promise<Chat> {
        try {
            return await ApiService.post<Chat>('/chats', chatData);
        } catch (error) {
            console.error('Error creating chat:', error);
            throw error;
        }
    }

    static async getChatMessages(
        chatId: string,
        skip: number = 0,
        limit: number = 50
    ): Promise<MessageList> {
        try {
            const response = await ApiService.get<MessageList>(
                `/chats/${chatId}/messages`,
                { skip, limit }
            );

            // Ensure message_type is converted to the proper enum value
            if (response && response.items) {
                response.items = response.items.map(msg => {
                    // Normalize message_type for consistent comparison
                    if (typeof msg.message_type === 'string') {
                        const msgType = msg.message_type.toLowerCase();
                        if (msgType === 'user') {
                            msg.message_type = MessageType.USER;
                        } else if (msgType === 'ai') {
                            msg.message_type = MessageType.AI;
                        } else if (msgType === 'system') {
                            msg.message_type = MessageType.SYSTEM;
                        }
                    }
                    return msg;
                });
            }

            return response;
        } catch (error) {
            console.error(`Error fetching messages for chat ${chatId}:`, error);
            throw error;
        }
    }

    static async sendMessage(
        chatId: string,
        messageData: SendMessageRequest
    ): Promise<ChatMessage> {
        try {
            console.log(`Sending message to chat ${chatId}:`, messageData);
            const response = await ApiService.post<ChatMessage>(
                `/chats/${chatId}/messages`,
                messageData
            );
            console.log(`Message sent successfully to chat ${chatId}, response:`, response);

            // Normalize message_type
            if (typeof response.message_type === 'string') {
                const msgType = response.message_type.toLowerCase();
                if (msgType === 'user') {
                    response.message_type = MessageType.USER;
                } else if (msgType === 'ai') {
                    response.message_type = MessageType.AI;
                } else if (msgType === 'system') {
                    response.message_type = MessageType.SYSTEM;
                }
            }

            return response;
        } catch (error) {
            const axiosError = error as AxiosError;
            console.error(`Error sending message to chat ${chatId}:`, error);

            // Extract more detailed error information if available
            if (axiosError.response) {
                console.error('Error response status:', axiosError.response.status);
                console.error('Error response data:', axiosError.response.data);
            }

            throw error;
        }
    }

    static async sendSystemMessage(
        chatId: string,
        systemMessageData: { content: string; message_type?: string }
    ): Promise<ChatMessage> {
        try {
            // Ensure message_type is set to SYSTEM
            const data = {
                content: systemMessageData.content,
                message_type: systemMessageData.message_type || MessageType.SYSTEM
            };

            console.log(`Sending system message to chat ${chatId}:`, data);

            try {
                // First try the dedicated system message endpoint
                const response = await ApiService.post<ChatMessage>(
                    `/chats/${chatId}/system-messages`,
                    data
                );
                console.log(`System message sent successfully to chat ${chatId}:`, response);
                return response;
            } catch (endpointError) {
                console.warn(`System message endpoint failed, trying fallback for chat ${chatId}:`, endpointError);

                // If dedicated endpoint fails, create a generic message with SYSTEM type
                const fallbackData = {
                    content: data.content,
                    message_type: MessageType.SYSTEM
                };

                const response = await ApiService.post<ChatMessage>(
                    `/chats/${chatId}/messages`,
                    fallbackData
                );

                console.log(`Fallback system message sent successfully to chat ${chatId}:`, response);
                return response;
            }
        } catch (error) {
            console.error(`Error sending system message to chat ${chatId}:`, error);

            // Create a client-side system message as last resort
            return {
                id: `system-${Date.now()}`,
                chat_id: chatId,
                content: systemMessageData.content,
                message_type: MessageType.SYSTEM,
                status: "COMPLETED",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                sources: [],
                files: [],
                reactions: []
            };
        }
    }

    static async addReaction(
        chatId: string,
        messageId: string,
        reaction: ReactionCreate
    ): Promise<void> {
        try {
            // Convert the reaction_type to proper case (like/dislike)
            const reactionTypeLower = reaction.reaction_type.toLowerCase();

            // Standardize to lowercase for API
            const standardizedReaction = {
                reaction_type: reactionTypeLower === 'like' || reactionTypeLower === 'dislike' ?
                    reactionTypeLower : 'like' // Default to 'like' if invalid
            };

            await ApiService.post<void>(
                `/chats/${chatId}/messages/${messageId}/reaction`,
                standardizedReaction
            );
        } catch (error) {
            console.error(`Error adding reaction to message ${messageId}:`, error);
            throw error;
        }
    }

    static async getChatSuggestions(chatId: string): Promise<string[]> {
        try {
            const response = await ApiService.get<string[]>(`/chats/${chatId}/suggestions`);
            console.log(`Retrieved suggestions for chat ${chatId}:`, response);
            return response;
        } catch (error) {
            console.error(`Error fetching suggestions for chat ${chatId}:`, error);
            return [];
        }
    }
}

export default ChatApi;