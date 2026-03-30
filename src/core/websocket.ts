/**
 * WebSocket server for real-time updates.
 * Uses Socket.IO with JWT authentication.
 * Clients join tenant-specific rooms and role-specific channels.
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../shared/utils/jwt.js';
import { eventBus, EVENTS, DomainEvent } from './event-bus.js';
import { env } from '../config/env.js';

let io: Server | null = null;

export function initWebSocket(httpServer: HttpServer): Server {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.includes('*') ? true : allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      (socket as Socket & { user: typeof payload }).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { user: { tenantId: string; role: string; userId: string } })
      .user;
    if (!user) return;

    // Join tenant room and role-specific channel
    socket.join(`tenant:${user.tenantId}`);
    socket.join(`role:${user.tenantId}:${user.role}`);
    socket.join(`user:${user.userId}`);

    socket.on('disconnect', () => {
      // Cleanup handled automatically by Socket.IO
    });
  });

  // Wire up domain events → WebSocket broadcasts
  wireEventsToBroadcast();

  console.log('✅ WebSocket server initialized');
  return io;
}

export function getIO(): Server | null {
  return io;
}

/**
 * Broadcast to all users in a tenant.
 */
export function broadcastToTenant(tenantId: string, event: string, data: unknown): void {
  io?.to(`tenant:${tenantId}`).emit(event, data);
}

/**
 * Broadcast to users with a specific role in a tenant.
 */
export function broadcastToRole(
  tenantId: string,
  role: string,
  event: string,
  data: unknown,
): void {
  io?.to(`role:${tenantId}:${role}`).emit(event, data);
}

/**
 * Send to a specific user.
 */
export function sendToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

// ─── Wire domain events to WebSocket ─────────────────────

function wireEventsToBroadcast(): void {
  // Broadcast all domain events to the tenant
  eventBus.on('*', (event: DomainEvent) => {
    broadcastToTenant(event.tenantId, 'domain:event', {
      type: event.type,
      entity: event.entity,
      entityId: event.entityId,
      payload: event.payload,
      timestamp: event.timestamp,
    });
  });

  // Specific targeted broadcasts
  eventBus.on(EVENTS.RESULT_ENTERED, (event: DomainEvent) => {
    broadcastToRole(event.tenantId, 'PATHOLOGIST', 'queue:update', {
      type: 'result-pending-verification',
      entityId: event.entityId,
    });
  });

  eventBus.on(EVENTS.SAMPLE_COLLECTED, (event: DomainEvent) => {
    broadcastToRole(event.tenantId, 'LAB_TECHNICIAN', 'queue:update', {
      type: 'sample-ready-for-lab',
      entityId: event.entityId,
    });
  });

  eventBus.on(EVENTS.REPORT_APPROVED, (event: DomainEvent) => {
    broadcastToRole(event.tenantId, 'RECEPTIONIST', 'queue:update', {
      type: 'report-ready-for-dispatch',
      entityId: event.entityId,
    });
  });
}
