// src/lib/websocket-service.ts
type MessageListener = (data: any) => void;
type ConnectionListener = (status: 'open' | 'closed' | 'error', code?: number, reason?: string) => void; // Added code and reason for 'closed'/'error'
type ErrorListener = (error: any) => void;

// WebSocket states
export enum WebSocketState {
    CONNECTING = 0,
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3,
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
const MAX_RECONNECT_ATTEMPTS = 30;
const INITIAL_RECONNECT_INTERVAL = 500; // 3 seconds
const MAX_RECONNECT_INTERVAL = 30000; // 30 seconds
const RECONNECT_BACKOFF_MULTIPLIER = 1.5;
const PING_INTERVAL = 45000; // 45 seconds
const PONG_TIMEOUT = 15000; // 15 seconds wait for pong (increased slightly)
const CONNECTION_TIMEOUT = 10000; // 10 seconds to establish connection

export class WebSocketService {
    private socket: WebSocket | null = null;
    private chatId: string;
    private token: string;
    private messageListeners: MessageListener[] = [];
    private connectionListeners: ConnectionListener[] = [];
    private errorListeners: ErrorListener[] = [];
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private pingIntervalTimer: NodeJS.Timeout | null = null;
    private pongTimeoutTimer: NodeJS.Timeout | null = null;
    private connectionTimeoutTimer: NodeJS.Timeout | null = null;
    private connectingPromise: Promise<boolean> | null = null;
    private isNewChat: boolean = false;
    private isManuallyDisconnected = false;
    private lastError: Error | null = null;
    private instanceId = Math.random().toString(36).substring(2, 7); // For debugging multiple instances

    constructor(chatId: string, token: string) {
        this.chatId = chatId;
        this.token = token;
        console.log(`WebSocketService [${this.instanceId}] created for chat ${chatId}`);
    }

    public setNewChatFlag(isNewChat: boolean): void {
        this.isNewChat = isNewChat;
    }

    private clearTimers(): void {
        // console.log(`[${this.instanceId}] Clearing timers`);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.pingIntervalTimer) clearInterval(this.pingIntervalTimer);
        if (this.pongTimeoutTimer) clearTimeout(this.pongTimeoutTimer);
        if (this.connectionTimeoutTimer) clearTimeout(this.connectionTimeoutTimer);
        this.reconnectTimer = null;
        this.pingIntervalTimer = null;
        this.pongTimeoutTimer = null;
        this.connectionTimeoutTimer = null;
    }

    private cleanupSocket(reason: string = "Unknown"): void {
        // console.log(`[${this.instanceId}] cleanupSocket called, reason: ${reason}`);
        this.clearTimers();
        if (this.socket) {
            const oldSocket = this.socket;
            this.socket = null;
            // Remove listeners immediately to prevent further events
            oldSocket.onopen = null;
            oldSocket.onmessage = null;
            oldSocket.onclose = null;
            oldSocket.onerror = null;

            if (oldSocket.readyState !== WebSocketState.CLOSED && oldSocket.readyState !== WebSocketState.CLOSING) {
                console.log(`[${this.instanceId}] Closing old socket (readyState ${oldSocket.readyState}), reason: ${reason}`);
                try {
                    // Use code 1000 for intentional client-side closure during cleanup
                    oldSocket.close(1000, `Client cleanup: ${reason}`);
                } catch (e) {
                    console.error(`[${this.instanceId}] Error closing old socket during cleanup:`, e);
                }
            } else {
                // console.log(`[${this.instanceId}] Old socket already closing/closed (readyState ${oldSocket.readyState})`);
            }
        }
        // Clear connecting promise if cleanup happens during connection attempt
        if (this.connectingPromise) {
            // console.log(`[${this.instanceId}] Clearing connectingPromise during cleanup`);
            // Resolve potentially waiting promise as false if cleanup happens before success
            // Note: This resolution might need careful handling depending on the exact scenario
            // connect() already handles resolving the promise on error/timeout.
            this.connectingPromise = null;
        }
    }


    public connect(): Promise<boolean> {
        if (this.connectingPromise) {
            console.log(`[${this.instanceId}] WebSocket connect called while already connecting for chat ${this.chatId}`);
            return this.connectingPromise;
        }
        if (this.isConnected()) {
            console.log(`[${this.instanceId}] WebSocket already connected for chat ${this.chatId}`);
            return Promise.resolve(true);
        }

        this.isManuallyDisconnected = false;

        this.connectingPromise = new Promise((resolve) => {
            const attemptNumber = this.reconnectAttempts + 1;

            if (attemptNumber > MAX_RECONNECT_ATTEMPTS) {
                const errorMsg = `Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached for chat ${this.chatId}`;
                console.error(`[${this.instanceId}] ${errorMsg}`);
                this.lastError = new Error(errorMsg);
                this.notifyError(this.lastError);
                this.notifyConnectionListeners('error', undefined, errorMsg);
                resolve(false);
                // No need to clear promise here, finally block will do it
                return;
            }

            this.cleanupSocket(`Starting connection attempt ${attemptNumber}`);

            let wsUrl = `${WS_BASE_URL}/chat/${this.chatId}?token=${this.token}`;
            if (this.isNewChat) {
                wsUrl += '&new_chat=true';
            }

            console.log(`[${this.instanceId}] Connecting to WebSocket: ${wsUrl} (attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS})`);

            try {
                const newSocket = new WebSocket(wsUrl);

                newSocket.onopen = (event) => this.handleOpen(event, newSocket, resolve);
                newSocket.onmessage = (event) => this.handleMessage(event, newSocket);
                newSocket.onclose = (event) => this.handleClose(event, newSocket);
                // Pass resolve to error handler ONLY to resolve the connect promise on connection error
                newSocket.onerror = (event) => this.handleError(event, newSocket, this.connectingPromise ? resolve : undefined);

                this.socket = newSocket; // Assign to instance variable *after* handlers are set

                this.connectionTimeoutTimer = setTimeout(() => {
                    if (this.socket === newSocket && newSocket.readyState === WebSocketState.CONNECTING) {
                        console.warn(`[${this.instanceId}] WebSocket connection attempt timed out for chat ${this.chatId}`);
                        // Trigger close handling which includes cleanup and reconnect logic
                        this.handleClose({ code: 1006, reason: "Connection timeout", wasClean: false } as CloseEvent, newSocket);
                        // Resolve the connection promise as false if it's still pending
                        if (this.connectingPromise) {
                            resolve(false);
                        }
                    }
                }, CONNECTION_TIMEOUT);

            } catch (error) {
                console.error(`[${this.instanceId}] Error creating WebSocket for chat ${this.chatId}:`, error);
                this.notifyError(error);
                // Trigger close handling for reconnect logic
                this.handleClose({ code: 1006, reason: "Connection creation error", wasClean: false } as CloseEvent, null);
                resolve(false);
            }
        });

        // Ensure the promise reference is cleared once it's settled
        this.connectingPromise.finally(() => {
            this.connectingPromise = null;
        });

        return this.connectingPromise;
    }

    public disconnect(): void {
        console.log(`[${this.instanceId}] Manually disconnecting WebSocket for chat ${this.chatId}`);
        this.isManuallyDisconnected = true;
        this.lastError = null;
        this.reconnectAttempts = 0;
        this.cleanupSocket("Manual disconnect");
        this.notifyConnectionListeners('closed', 1000, "Manual disconnect");
    }

    // --- Event Handlers ---
    private handleOpen(event: Event, socketInstance: WebSocket, resolve: (value: boolean) => void): void {
        if (this.socket !== socketInstance) {
            console.warn(`[${this.instanceId}] handleOpen received for outdated socket instance.`);
            resolve(false); // Resolve the original promise as failed
            if (socketInstance.readyState === WebSocketState.OPEN) {
                try { socketInstance.close(1000, "Stale connection opened"); } catch(e){}
            }
            return;
        }

        console.log(`[${this.instanceId}] WebSocket connection established for chat ${this.chatId}`);
        if(this.connectionTimeoutTimer) clearTimeout(this.connectionTimeoutTimer);
        this.connectionTimeoutTimer = null;
        this.reconnectAttempts = 0;
        this.lastError = null;

        this.startPingInterval();

        this.notifyConnectionListeners('open');
        resolve(true);
    }

    private handleMessage(event: MessageEvent, socketInstance: WebSocket): void {
        if (this.socket !== socketInstance) return; // Ignore messages from old sockets

        this.resetPongTimeout(); // Reset pong timer on ANY message

        try {
            const data = JSON.parse(event.data);

            if (data.type === 'pong') {
                // console.log(`[${this.instanceId}] Pong received`); // Debug Pong
                return;
            }

            // console.log(`[${this.instanceId}] WebSocket message received:`, event.data); // Debug Message

            this.messageListeners.forEach(listener => {
                try { listener(data); } catch (e) { console.error(`[${this.instanceId}] Error in message listener:`, e); }
            });

        } catch (error) {
            console.error(`[${this.instanceId}] Error handling WebSocket message:`, error);
            console.log(`[${this.instanceId}] Raw message data:`, event.data);
        }
    }

    private handleClose(event: CloseEvent, socketInstance: WebSocket | null): void {
        // Prevent handling close for sockets that aren't the current one
        if (socketInstance && this.socket !== socketInstance) {
            console.warn(`[${this.instanceId}] handleClose received for outdated socket instance (code=${event.code}). Ignoring.`);
            return;
        }
        // If this.socket is already null, we've likely handled the closure already
        if (!this.socket && socketInstance == null) {
            console.log(`[${this.instanceId}] handleClose called after socket already cleaned up (code=${event.code}).`);
            return;
        }

        console.log(`[${this.instanceId}] WebSocket closed for chat ${this.chatId}: code=${event.code}, reason='${event.reason}', wasClean=${event.wasClean}`);

        const wasManuallyDisconnected = this.isManuallyDisconnected;

        // Perform cleanup *before* notifying listeners or scheduling reconnect
        this.cleanupSocket(`Closed with code ${event.code}`);

        // Notify listeners about the closure status
        this.notifyConnectionListeners('closed', event.code, event.reason);

        // Decide whether to reconnect
        if (!wasManuallyDisconnected && event.code !== 1000) {
            // Codes like 1006 (Abnormal Closure), 1012 (Service Restart) should trigger reconnect
            const errorReason = event.reason || `WebSocket closed unexpectedly with code ${event.code}`;
            // Avoid setting lastError if it's already set to max retries
            if (!this.lastError?.message.includes("Maximum reconnection attempts reached")) {
                this.lastError = new Error(errorReason);
                this.notifyError(this.lastError);
            }
            this.scheduleReconnect();
        } else {
            console.log(`[${this.instanceId}] Clean disconnect or manual disconnect, not reconnecting.`);
            this.reconnectAttempts = 0;
            this.isManuallyDisconnected = false; // Reset flag only after handling closure
        }
    }


    private handleError(event: Event, socketInstance: WebSocket, resolve?: (value: boolean) => void): void {
        if (this.socket !== socketInstance) {
            console.warn(`[${this.instanceId}] handleError received for outdated socket instance.`);
            return; // Ignore errors from old sockets
        }
        console.error(`[${this.instanceId}] WebSocket error event for chat ${this.chatId}. Event type: ${event.type}`);

        const error = new Error("WebSocket error occurred"); // Generic error, specific details often unavailable
        this.lastError = error;
        this.notifyError(error);
        this.notifyConnectionListeners('error', undefined, 'WebSocket error');

        // If this error happened during the initial connection attempt, resolve the promise as failed
        if (resolve) {
            console.log(`[${this.instanceId}] Resolving connect promise as false due to error during connection`);
            resolve(false);
            // connectingPromise is cleared in connect() finally block
        }

        // IMPORTANT: Don't clean up here. The 'close' event reliably follows 'error' in browsers.
        // Let handleClose manage cleanup and reconnection to avoid race conditions.
    }

    // --- Keep-Alive ---

    private startPingInterval(): void {
        // console.log(`[${this.instanceId}] Attempting to start ping interval...`); // Debug
        if (this.pingIntervalTimer) clearInterval(this.pingIntervalTimer);
        if (this.pongTimeoutTimer) clearTimeout(this.pongTimeoutTimer);

        this.pingIntervalTimer = setInterval(() => this.sendPing(), PING_INTERVAL);
        console.log(`[${this.instanceId}] Ping interval started for chat ${this.chatId}`);
    }

    private sendPing(): void {
        if (this.isConnected()) {
            try {
                // console.log(`[${this.instanceId}] Sending ping for chat ${this.chatId}`);
                this.socket?.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                this.resetPongTimeout(); // Start/reset waiting for pong
            } catch (e) {
                console.error(`[${this.instanceId}] Error sending ping for chat ${this.chatId}:`, e);
                // Force close and let handleClose manage reconnect
                this.cleanupSocket("Ping send error");
                this.notifyConnectionListeners('error', 1006, "Ping send error"); // Notify listeners
                this.scheduleReconnect(); // Explicitly schedule reconnect after error during ping
            }
        } else {
            // console.warn(`[${this.instanceId}] Cannot send ping, WebSocket not connected for chat ${this.chatId}`);
            if (this.pingIntervalTimer) clearInterval(this.pingIntervalTimer); // Stop pinging if not connected
            this.pingIntervalTimer = null;
        }
    }

    private resetPongTimeout(): void {
        if (this.pongTimeoutTimer) clearTimeout(this.pongTimeoutTimer);
        this.pongTimeoutTimer = setTimeout(() => {
            // Check if the socket still exists before acting
            if (this.socket && this.socket.readyState === WebSocketState.OPEN) {
                console.warn(`[${this.instanceId}] Pong timeout for chat ${this.chatId}. Closing and reconnecting.`);
                // Force close with a specific reason
                this.cleanupSocket("Pong timeout");
                this.notifyConnectionListeners('error', 1006, "Pong timeout");
                this.scheduleReconnect(); // Explicitly schedule reconnect
            } else {
                // console.log(`[${this.instanceId}] Pong timeout occurred after socket was closed/cleaned up.`);
                if (this.pongTimeoutTimer) clearTimeout(this.pongTimeoutTimer); // Ensure timer is cleared
                this.pongTimeoutTimer = null;
            }
        }, PONG_TIMEOUT);
    }

    // --- Reconnection ---

    private scheduleReconnect(): void {
        if (this.reconnectTimer) return; // Already scheduled
        if (this.isManuallyDisconnected) return;
        if (this.connectingPromise) return; // Already attempting to connect

        const nextAttempt = this.reconnectAttempts + 1;
        if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
            console.error(`[${this.instanceId}] Max reconnect attempts reached for chat ${this.chatId}. Giving up.`);
            if (!this.lastError?.message.includes("Maximum reconnection attempts reached")) {
                this.lastError = new Error("Maximum reconnection attempts reached");
                this.notifyError(this.lastError);
                this.notifyConnectionListeners('error', undefined, "Max reconnect attempts");
            }
            this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Cap attempts value
            return;
        }

        const backoffTime = Math.min(
            INITIAL_RECONNECT_INTERVAL * Math.pow(RECONNECT_BACKOFF_MULTIPLIER, nextAttempt - 1),
            MAX_RECONNECT_INTERVAL
        );

        console.log(`[${this.instanceId}] Scheduling reconnect attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS} in ${(backoffTime / 1000).toFixed(1)}s for chat ${this.chatId}`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.isManuallyDisconnected && !this.isConnected() && !this.connectingPromise) {
                this.reconnectAttempts = nextAttempt; // Update attempt count *before* connecting
                this.connect();
            } else {
                console.log(`[${this.instanceId}] Skipping scheduled reconnect for chat ${this.chatId} (connected=${this.isConnected()}, connecting=${!!this.connectingPromise}, manualDisconnect=${this.isManuallyDisconnected})`);
                if (this.isConnected() || this.connectingPromise) {
                    this.reconnectAttempts = 0; // Reset attempts if connection was restored elsewhere
                }
            }
        }, backoffTime);
    }

    // --- Listener Management ---
    public addMessageListener(listener: MessageListener): void { if (!this.messageListeners.includes(listener)) this.messageListeners.push(listener); }
    public removeMessageListener(listener: MessageListener): void { this.messageListeners = this.messageListeners.filter(l => l !== listener); }
    public addConnectionListener(listener: ConnectionListener): void { if (!this.connectionListeners.includes(listener)) this.connectionListeners.push(listener); }
    public removeConnectionListener(listener: ConnectionListener): void { this.connectionListeners = this.connectionListeners.filter(l => l !== listener); }
    public addErrorListener(listener: ErrorListener): void { if (!this.errorListeners.includes(listener)) this.errorListeners.push(listener); }
    public removeErrorListener(listener: ErrorListener): void { this.errorListeners = this.errorListeners.filter(l => l !== listener); }

    private notifyError(error: any): void { this.errorListeners.forEach(l => { try { l(error); } catch (e) { console.error(`[${this.instanceId}] Error in error listener:`, e); } }); }
    private notifyConnectionListeners(status: 'open' | 'closed' | 'error', code?: number, reason?: string): void {
        this.connectionListeners.forEach(l => { try { l(status, code, reason); } catch (e) { console.error(`[${this.instanceId}] Error in connection listener:`, e); } });
    }

    // --- State Checks ---
    public getState(): WebSocketState {
        if (this.connectingPromise) return WebSocketState.CONNECTING;
        return this.socket?.readyState ?? WebSocketState.CLOSED;
    }
    public isConnected(): boolean { return this.socket?.readyState === WebSocketState.OPEN; }
}

export default WebSocketService;