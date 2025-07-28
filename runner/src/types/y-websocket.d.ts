declare module 'y-websocket/bin/utils' {
  import { IncomingMessage } from 'http';
  import WebSocket from 'ws';

  interface ConnectionOptions {
    gc?: boolean;
    [key: string]: unknown;
  }

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: ConnectionOptions
  ): void;
} 