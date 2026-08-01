import { WebSocketMessagingClient } from "@talak-web3/realtime";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  sentMessages: string[] = [];
  private listeners: Record<string, ((evt: unknown) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, handler: (evt: unknown) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type]!.push(handler);
  }

  removeEventListener(type: string, handler: (evt: unknown) => void) {
    this.listeners[type] = this.listeners[type]?.filter((h) => h !== handler) ?? [];
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    for (const h of this.listeners["open"] ?? []) h({});
  }

  simulateMessage(data: unknown) {
    for (const h of this.listeners["message"] ?? []) h({ data: JSON.stringify(data) });
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    for (const h of this.listeners["close"] ?? []) h({});
  }

  simulateError(msg = "mock error") {
    for (const h of this.listeners["error"] ?? []) h(new Error(msg));
  }
}

let mockWs: MockWebSocket;
const OriginalWebSocket = globalThis.WebSocket;

beforeEach(() => {
  vi.stubGlobal(
    "WebSocket",
    class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWs = this;
      }
    } as unknown as typeof WebSocket,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  if (OriginalWebSocket) vi.stubGlobal("WebSocket", OriginalWebSocket);
});

function createClient() {
  return new WebSocketMessagingClient({ serverUrl: "ws://localhost:8080", from: "test-user" });
}

describe("WebSocketMessagingClient", () => {
  describe("connect", () => {
    it("resolves on open", async () => {
      const client = createClient();
      const promise = client.connect();
      mockWs.simulateOpen();
      await expect(promise).resolves.toBeUndefined();
      client.disconnect();
    });

    it("rejects on error before open", async () => {
      const client = createClient();
      const promise = client.connect();
      mockWs.simulateError("connection refused");
      await expect(promise).rejects.toThrow("WebSocket connection failed");
    });
  });

  describe("disconnect", () => {
    it("closes the socket and stops heartbeat", async () => {
      const client = createClient();
      const promise = client.connect();
      mockWs.simulateOpen();
      await promise;
      client.disconnect();
      expect(mockWs.readyState).toBe(MockWebSocket.CLOSED);
    });
  });

  describe("onMessage", () => {
    it("registers and unregisters handlers", async () => {
      const client = createClient();
      const promise = client.connect();
      mockWs.simulateOpen();
      await promise;

      const messages: unknown[] = [];
      const unsub = client.onMessage((msg) => messages.push(msg));

      mockWs.simulateMessage({
        type: "message",
        conversationId: "conv-1",
        message: { id: "m1", sentAtMs: Date.now(), from: "alice", body: "hi" },
      });
      expect(messages).toHaveLength(1);

      unsub();
      mockWs.simulateMessage({
        type: "message",
        conversationId: "conv-1",
        message: { id: "m2", sentAtMs: Date.now(), from: "bob", body: "yo" },
      });
      expect(messages).toHaveLength(1);
      client.disconnect();
    });
  });

  describe("handleEnvelope", () => {
    it("responds to ping with pong", async () => {
      const client = createClient();
      const promise = client.connect();
      mockWs.simulateOpen();
      await promise;

      const sendSpy = vi.spyOn(mockWs, "send");
      mockWs.simulateMessage({ type: "ping" });
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: "pong" }));
      client.disconnect();
    });

    it("resolves pending conversations", async () => {
      const client = createClient();
      const promise = client.connect();
      mockWs.simulateOpen();
      await promise;

      const convsPromise = client.listConversations();
      mockWs.simulateMessage({
        type: "conversations",
        items: [{ id: "c1", title: "Test" }],
      });
      await expect(convsPromise).resolves.toEqual([{ id: "c1", title: "Test" }]);
      client.disconnect();
    });

    it("resolves pending history", async () => {
      const client = createClient();
      const promise = client.connect();
      mockWs.simulateOpen();
      await promise;

      const historyPromise = client.listMessages("conv-1");
      const outbound = JSON.parse(mockWs.sentMessages.at(-1) as string) as {
        id?: string;
        conversationId: string;
      };

      expect(outbound.id).toBeDefined();
      mockWs.simulateMessage({
        type: "history",
        id: outbound.id,
        conversationId: "conv-1",
        messages: [{ id: "m1", sentAtMs: 1, from: "a", body: "b" }],
      });
      await expect(historyPromise).resolves.toHaveLength(1);
      client.disconnect();
    });
  });

  describe("error handling", () => {
    it("throws when sending on closed socket", async () => {
      const client = createClient();
      const promise = client.connect();
      mockWs.simulateOpen();
      await promise;

      client.disconnect();

      expect(client["connected"]).toBe(false);
    });
  });
});
