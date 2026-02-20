export class NotificationManager implements DurableObject {
  private state: DurableObjectState;
  private sessions: Map<string, WebSocket>;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response('userId required', { status: 400 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.state.acceptWebSocket(server);
      server.addEventListener('close', () => {
        this.sessions.delete(userId);
      });
      server.addEventListener('error', () => {
        this.sessions.delete(userId);
      });

      this.sessions.set(userId, server);

      return new Response(null, { status: 101, webSocket: client });
    }

    // POST - broadcast notification
    if (request.method === 'POST') {
      try {
        const body = await request.json() as { userIds: string[]; notification: unknown };
        const { userIds, notification } = body;

        for (const userId of userIds) {
          const ws = this.sessions.get(userId);
          if (ws) {
            try {
              ws.send(JSON.stringify(notification));
            } catch {
              this.sessions.delete(userId);
            }
          }
        }

        return new Response(JSON.stringify({ sent: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response('Invalid body', { status: 400 });
      }
    }

    // GET - connection count
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ connections: this.sessions.size }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }

  webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {
    // Handle incoming WebSocket messages (ping/pong, etc.)
  }

  webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    // Clean up on close
    for (const [userId, socket] of this.sessions.entries()) {
      if (socket === _ws) {
        this.sessions.delete(userId);
        break;
      }
    }
  }
}
