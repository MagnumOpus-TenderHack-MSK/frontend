type MessageListener = (data: any) => void;
type ConnectionListener = () => void;
type ErrorListener = (error: any) => void;

// WebSocket states
export enum WebSocketState {
    CONNECTING = 0,
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3,
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

export class WebSocketService {
    private socket: WebSocket | null = null;
    private chatId: string;
    private token: string;
    private messageListeners: MessageListener[] = [];
    private connectionListeners: ConnectionListener[] = [];
    private errorListeners: ErrorListener[] = [];
    private reconnectTimer: NodeJS.Timeout | null = null;
    private maxReconnectAttempts = 5;
    private reconnectAttempts = 0;
    private reconnectInterval = 2000; // Start with 2 seconds
    private pingInterval: NodeJS.Timeout | null = null;
    private pongTimeout: NodeJS.Timeout | null = null;
    private connectingPromise: Promise<boolean> | null = null;
    private connectingResolve: ((value: boolean) => void) | null = null;
    private isNewChat: boolean = false;

    constructor(chatId: string, token: string) {
        this.chatId = chatId;
        this.token = token;
    }

    public setNewChatFlag(isNewChat: boolean): void {
        this.isNewChat = isNewChat;
    }

    public connect(): Promise<boolean> {
        // If we already have an active connecting promise, return it
        if (this.connectingPromise) {
            return this.connectingPromise;
        }

        // Create a new promise for this connection attempt
        this.connectingPromise = new Promise((resolve) => {
            this.connectingResolve = resolve;

            try {
                // If socket exists and is already connecting or open, don't create a new connection
                if (this.socket && (this.socket.readyState === WebSocketState.CONNECTING ||
                    this.socket.readyState === WebSocketState.OPEN)) {
                    console.log('WebSocket connection already exists');
                    resolve(true);
                    return;
                }

                // Clear any existing timers
                this.clearTimers();

                // Don't try to reconnect if max attempts reached
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    this.notifyError(new Error('Maximum reconnection attempts reached'));
                    resolve(false);
                    return;
                }

                // Add new_chat flag as query parameter if this is a new chat
                let wsUrl = `${WS_BASE_URL}/chat/${this.chatId}?token=${this.token}`;
                if (this.isNewChat) {
                    wsUrl += '&new_chat=true';
                }

                console.log(`Connecting to WebSocket: ${wsUrl}`);

                // Create a new WebSocket
                this.socket = new WebSocket(wsUrl);

                // Set up event handlers
                this.socket.onopen = this.handleOpen.bind(this);
                this.socket.onmessage = this.handleMessage.bind(this);
                this.socket.onclose = this.handleClose.bind(this);
                this.socket.onerror = this.handleError.bind(this);

                // Set a timeout for the connection attempt
                setTimeout(() => {
                    if (this.connectingResolve) {
                        console.log('WebSocket connection timeout');
                        this.connectingResolve(false);
                        this.connectingResolve = null;
                        this.connectingPromise = null;
                    }
                }, 10000); // 10 second timeout
            } catch (error) {
                console.error('Error connecting to WebSocket:', error);
                this.notifyError(error);

                // Try to reconnect after error
                this.reconnect();
                resolve(false);
            }
        });

        return this.connectingPromise;
    }

    public disconnect(): void {
        if (this.socket && this.socket.readyState === WebSocketState.OPEN) {
            this.socket.close();
        }
        this.clearTimers();

        // Clear the connecting promise
        this.connectingPromise = null;
        this.connectingResolve = null;
    }

    public addMessageListener(listener: MessageListener): void {
        this.messageListeners.push(listener);
    }

    public removeMessageListener(listener: MessageListener): void {
        this.messageListeners = this.messageListeners.filter(l => l !== listener);
    }

    public addConnectionListener(listener: ConnectionListener): void {
        this.connectionListeners.push(listener);
    }

    public removeConnectionListener(listener: ConnectionListener): void {
        this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    }

    public addErrorListener(listener: ErrorListener): void {
        this.errorListeners.push(listener);
    }

    public removeErrorListener(listener: ErrorListener): void {
        this.errorListeners = this.errorListeners.filter(l => l !== listener);
    }

    public sendMessage(data: any): void {
        if (this.socket && this.socket.readyState === WebSocketState.OPEN) {
            const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
            console.log('Sending WebSocket message:', jsonData);
            this.socket.send(jsonData);
        } else {
            console.error('Cannot send message, WebSocket is not connected');
            this.notifyError(new Error('WebSocket is not connected'));
        }
    }

    public requestStreamContent(messageId: string): void {
        if (!messageId) {
            console.error('Cannot request stream, no message ID provided');
            return;
        }

        this.sendMessage({
            type: 'stream_request',
            message_id: messageId
        });
    }

    public requestSuggestions(): void {
        this.sendMessage({
            type: 'get_suggestions'
        });
    }

    public getState(): WebSocketState | null {
        return this.socket?.readyState ?? null;
    }

    public isConnected(): boolean {
        return this.socket?.readyState === WebSocketState.OPEN;
    }

    // Send ping to keep connection alive
    private sendPing(): void {
        if (this.isConnected()) {
            const pingData = {
                type: 'ping',
                timestamp: Date.now()
            };
            this.sendMessage(pingData);

            // Set timeout for pong response
            this.pongTimeout = setTimeout(() => {
                // No pong received in time, reconnect
                console.warn('WebSocket ping timeout, reconnecting...');
                this.reconnect();
            }, 5000); // 5 second timeout for pong
        }
    }

    private startPingInterval(): void {
        // Send ping every 30 seconds to keep connection alive
        this.pingInterval = setInterval(() => this.sendPing(), 30000);
    }

    private clearTimers(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }

    private reconnect(): void {
        this.reconnectAttempts++;

        // Calculate backoff time (exponential backoff)
        const backoffTime = Math.min(
            this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
            30000 // Max 30 seconds
        );

        console.log(`Attempting to reconnect in ${backoffTime / 1000} seconds...`);

        // Schedule reconnection
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, backoffTime);
    }

    private handleOpen(event: Event): void {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection

        // Start ping interval
        this.startPingInterval();

        // For new chats, request suggestions immediately
        if (this.isNewChat) {
            setTimeout(() => {
                this.requestSuggestions();
            }, 500);
        }

        // Notify listeners
        this.connectionListeners.forEach(listener => listener());

        // Resolve the connecting promise
        if (this.connectingResolve) {
            this.connectingResolve(true);
            this.connectingResolve = null;
        }

        // Clear the promise after successful connection
        this.connectingPromise = null;
    }

    private handleMessage(event: MessageEvent): void {
        try {
            console.log('WebSocket message received:', event.data);

            // Handle string messages (could be from a text frame)
            let data;
            if (typeof event.data === 'string') {
                try {
                    data = JSON.parse(event.data);
                } catch (e) {
                    console.log('Received non-JSON message:', event.data);
                    // Still try to notify listeners with raw data
                    this.messageListeners.forEach(listener => listener(event.data));
                    return;
                }
            } else {
                console.log('Received non-string message type:', typeof event.data);
                return;
            }

            // Clear pong timeout if this is a pong response
            if (data.type === 'pong') {
                if (this.pongTimeout) {
                    clearTimeout(this.pongTimeout);
                    this.pongTimeout = null;
                }
                return; // Don't propagate pongs to listeners
            }

            // Notify listeners of other messages
            this.messageListeners.forEach(listener => listener(data));
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }

    private handleClose(event: CloseEvent): void {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);

        this.clearTimers();

        // Only reconnect for specific close codes
        if (event.code !== 1000 && event.code !== 1001) { // Normal closure or going away
            this.reconnect();
        }
    }

    private handleError(event: Event): void {
        console.error('WebSocket error:', event);
        this.notifyError(event);
    }

    private notifyError(error: any): void {
        this.errorListeners.forEach(listener => listener(error));
    }
}

export default WebSocketService;