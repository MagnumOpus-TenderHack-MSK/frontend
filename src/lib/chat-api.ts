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
                    if (msg.message_type === 'user' || msg.message_type === 'USER') {
                        msg.message_type = MessageType.USER;
                    } else if (msg.message_type === 'ai' || msg.message_type === 'AI') {
                        msg.message_type = MessageType.AI;
                    } else if (msg.message_type === 'system' || msg.message_type === 'SYSTEM') {
                        msg.message_type = MessageType.SYSTEM;
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
            if (response.message_type === 'user' || response.message_type === 'USER') {
                response.message_type = MessageType.USER;
            } else if (response.message_type === 'ai' || response.message_type === 'AI') {
                response.message_type = MessageType.AI;
            } else if (response.message_type === 'system' || response.message_type === 'SYSTEM') {
                response.message_type = MessageType.SYSTEM;
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

    static async addReaction(
        chatId: string,
        messageId: string,
        reaction: ReactionCreate
    ): Promise<void> {
        try {
            await ApiService.post<void>(
                `/chats/${chatId}/messages/${messageId}/reaction`,
                reaction
            );
        } catch (error) {
            console.error(`Error adding reaction to message ${messageId}:`, error);
            throw error;
        }
    }
}

export default ChatApi;