// Store for active SSE connections per user
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Broadcast a notification to all active SSE connections for a user
 */
export function broadcastToUser(userId: string, data: unknown) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const controller of userConnections) {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch {
        // Connection closed, will be cleaned up
      }
    }
  }
}

/**
 * Register a new SSE connection for a user
 */
export function registerConnection(userId: string, controller: ReadableStreamDefaultController) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(controller);
}

/**
 * Remove a connection for a user
 */
export function removeConnection(userId: string, controller: ReadableStreamDefaultController) {
  const userConns = connections.get(userId);
  if (userConns) {
    userConns.delete(controller);
    if (userConns.size === 0) {
      connections.delete(userId);
    }
  }
}

/**
 * Get the number of active connections for a user (for debugging)
 */
export function getConnectionCount(userId: string): number {
  return connections.get(userId)?.size || 0;
}
