import { TalakWeb3Error, REALTIME_ERROR_CODES } from "@talak-web3/errors";

/** A real-time message within a conversation. */
export interface Message {
  id: string;
  sentAtMs: number;
  from: string;
  body: string;
}

/** A conversation channel containing messages and participants. */
export interface Conversation {
  id: string;
  title?: string;
  participants?: string[];
}

/** Interface for real-time messaging clients (WebSocket, polling, etc.). */
export interface MessagingClient {
  connect(): Promise<void>;
  disconnect(): void;
  listConversations(): Promise<Conversation[]>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, body: string): Promise<{ id: string }>;
  onMessage(handler: (msg: Message & { conversationId: string }) => void): () => void;
}

type WsEnvelope =
  | { type: "ping" }
  | { type: "pong" }
  | { type: "conversations"; id?: string; items: Conversation[] }
  | { type: "history"; id?: string; conversationId: string; messages: Message[] }
  | { type: "message"; conversationId: string; message: Message }
  | { type: "sent"; id: string }
  | { type: "error"; id?: string; code: string; message: string };

type OutboundEnvelope =
  | { type: "list_conversations"; id: string }
  | { type: "get_history"; id: string; conversationId: string }
  | { type: "send"; id: string; conversationId: string; body: string; from: string };

/** Options for configuring the WebSocket messaging client. */
export interface WebSocketMessagingOptions {
  serverUrl: string;
  from: string;
  maxBackoffMs?: number;
}

interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

function newRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class WebSocketMessagingClient implements MessagingClient {
  private ws: WebSocket | undefined;
  private connected = false;
  private backoffMs = 500;
  private readonly maxBackoffMs: number;
  private destroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  private readonly pendingConversations = new Map<string, PendingRequest<Conversation[]>>();
  private readonly pendingHistory = new Map<string, PendingRequest<Message[]>>();
  private readonly pendingSend = new Map<string, PendingRequest<{ id: string }>>();
  private readonly messageHandlers = new Set<(msg: Message & { conversationId: string }) => void>();

  private boundHandlers?: {
    open: () => void;
    error: (evt: Event) => void;
    close: () => void;
    message: (evt: MessageEvent) => void;
  };

  constructor(private readonly opts: WebSocketMessagingOptions) {
    this.maxBackoffMs = opts.maxBackoffMs ?? 30_000;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.opts.serverUrl);

      this.boundHandlers = {
        open: () => {
          this.connected = true;
          this.backoffMs = 500;
          this.startHeartbeat();
          resolve();
        },
        error: (evt) => {
          if (!this.connected) reject(new Error(`WebSocket connection failed: ${String(evt)}`));
        },
        close: () => {
          this.connected = false;
          this.stopHeartbeat();
          if (!this.destroyed) this.scheduleReconnect();
        },
        message: (evt) => {
          try {
            const envelope = JSON.parse(evt.data as string) as WsEnvelope;
            this.handleEnvelope(envelope);
          } catch {
            // non-fatal: malformed envelope
          }
        },
      };

      this.ws.addEventListener("open", this.boundHandlers.open);
      this.ws.addEventListener("error", this.boundHandlers.error);
      this.ws.addEventListener("close", this.boundHandlers.close);
      this.ws.addEventListener("message", this.boundHandlers.message);
    });
  }

  disconnect(): void {
    this.destroyed = true;
    this.connected = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws && this.boundHandlers) {
      this.ws.removeEventListener("open", this.boundHandlers.open);
      this.ws.removeEventListener("error", this.boundHandlers.error);
      this.ws.removeEventListener("close", this.boundHandlers.close);
      this.ws.removeEventListener("message", this.boundHandlers.message);
    }

    this.ws?.close();

    const disconnectedError = new Error("Disconnected");
    for (const [, req] of this.pendingConversations) {
      clearTimeout(req.timer);
      req.reject(disconnectedError);
    }
    this.pendingConversations.clear();
    for (const [, req] of this.pendingHistory) {
      clearTimeout(req.timer);
      req.reject(disconnectedError);
    }
    this.pendingHistory.clear();
    for (const [, req] of this.pendingSend) {
      clearTimeout(req.timer);
      req.reject(disconnectedError);
    }
    this.pendingSend.clear();
  }

  async listConversations(): Promise<Conversation[]> {
    const id = newRequestId();
    return new Promise<Conversation[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingConversations.delete(id);
        reject(new Error("listConversations timeout"));
      }, 10_000);
      this.pendingConversations.set(id, { resolve, reject, timer });
      this.send({ type: "list_conversations", id });
    });
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    const id = newRequestId();
    return new Promise<Message[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingHistory.delete(id);
        reject(new Error("listMessages timeout"));
      }, 10_000);
      this.pendingHistory.set(id, { resolve, reject, timer });
      this.send({ type: "get_history", id, conversationId });
    });
  }

  async sendMessage(conversationId: string, body: string): Promise<{ id: string }> {
    const id = newRequestId();
    return new Promise<{ id: string }>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingSend.delete(id);
        reject(new Error("sendMessage timeout"));
      }, 10_000);
      this.pendingSend.set(id, { resolve, reject, timer });
      this.send({ type: "send", id, conversationId, body, from: this.opts.from });
    });
  }

  onMessage(handler: (msg: Message & { conversationId: string }) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private send(envelope: OutboundEnvelope): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new TalakWeb3Error("WebSocket not connected", {
        code: REALTIME_ERROR_CODES.NOT_CONNECTED,
        status: 503,
      });
    }
    this.ws.send(JSON.stringify(envelope));
  }

  private handleEnvelope(envelope: WsEnvelope): void {
    switch (envelope.type) {
      case "ping":
        this.ws?.send(JSON.stringify({ type: "pong" }));
        break;
      case "pong":
        break;
      case "conversations": {
        if (envelope.id !== undefined) {
          const req = this.pendingConversations.get(envelope.id);
          if (req) {
            clearTimeout(req.timer);
            req.resolve(envelope.items);
            this.pendingConversations.delete(envelope.id);
          }
        } else {
          for (const [id, req] of this.pendingConversations) {
            clearTimeout(req.timer);
            req.resolve(envelope.items);
            this.pendingConversations.delete(id);
          }
        }
        break;
      }
      case "history": {
        let req: PendingRequest<Message[]> | undefined;
        let key: string | undefined;
        if (envelope.id !== undefined) {
          req = this.pendingHistory.get(envelope.id);
          key = envelope.id;
        } else {
          req = this.pendingHistory.get(envelope.conversationId);
          key = envelope.conversationId;
        }
        if (req) {
          clearTimeout(req.timer);
          req.resolve(envelope.messages);
          if (key !== undefined) this.pendingHistory.delete(key);
        }
        break;
      }
      case "message": {
        for (const h of this.messageHandlers) {
          h({ ...envelope.message, conversationId: envelope.conversationId });
        }
        break;
      }
      case "sent": {
        const req = this.pendingSend.get(envelope.id);
        if (req) {
          clearTimeout(req.timer);
          req.resolve({ id: envelope.id });
        }
        this.pendingSend.delete(envelope.id);
        break;
      }
    }
  }

  private scheduleReconnect(): void {
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) {
        void this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          // non-fatal: send error on closing socket
        }
      }
    }, 30_000);
    this.heartbeatTimer.unref?.();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
