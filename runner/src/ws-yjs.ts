import * as Y from 'yjs';
// @ts-ignore
import { setupWSConnection as setupYWSConnection } from 'y-websocket/bin/utils';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';

// Types for options if you need them in the future
interface ConnectionOptions {
  gc?: boolean;
  [key: string]: unknown;
}

/**
 * Wraps y-websocket's setupWSConnection to keep our runner clean and typed.
 */
export function setupWSConnection(
  conn: WebSocket,
  req: IncomingMessage,
  options: ConnectionOptions = { gc: true }
): void {
  setupYWSConnection(conn, req, options);
}
