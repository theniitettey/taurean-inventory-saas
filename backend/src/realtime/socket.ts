import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "../helpers/token.helper";
import { SupportTicketModel } from "../models/supportTicket.model";
import { SupportMessageModel } from "../models/supportMessage.model";
import { UserModel } from "../models/user.model";
import { Events } from "./events";
import { notifyUser, notifyCompany } from "../services/notification.service";

let io: Server | null = null;

// Track online users
const onlineUsers = new Map<string, { socketId: string; lastActivity: Date; companyId?: string }>();

// Track system health
let systemHealth = {
  status: 'healthy',
  lastCheck: new Date(),
  connectedUsers: 0,
  activeConnections: 0,
};

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth as any)?.token ||
        (socket.handshake.query as any)?.token;
      if (token) {
        try {
          const payload = verifyToken(token as string);
          (socket as any).user = payload;
          if (payload?.id) {
            socket.join(`user:${payload.id}`);
          }
          if ((payload as any)?.companyId) {
            socket.join(`company:${(payload as any).companyId}`);
          }
        } catch (err) {
          // allow anonymous connections as well
        }
      }
      next();
    } catch (e) {
      next();
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).user?.id;
    const companyId = (socket as any).user?.companyId;
    
    console.log(`Socket connected: ${userId || "anonymous"}`);
    
    // Update system health
    systemHealth.activeConnections++;
    systemHealth.lastCheck = new Date();
    
    // Track user online status
    if (userId) {
      onlineUsers.set(userId, { 
        socketId: socket.id, 
        lastActivity: new Date(), 
        companyId 
      });
      systemHealth.connectedUsers = onlineUsers.size;
      
      // Emit user online event
      emitToCompany(companyId, Events.UserOnline, { userId, timestamp: new Date() });
      
      // Update user's last activity
      UserModel.findByIdAndUpdate(userId, { 
        lastLoginAt: new Date(),
        isOnline: true 
      }).catch(console.error);
    }

    // Join user's company room
    if (companyId) {
      socket.join(`company:${companyId}`);
    }

    // Join super admin room if applicable
    if ((socket as any).user?.isSuperAdmin) {
      socket.join("super-admin");
    }

    socket.on("join", (room: string) => {
      if (typeof room === "string" && room.length > 0) {
        socket.join(room);
      }
    });

    socket.on("leave", (room: string) => {
      if (typeof room === "string" && room.length > 0) {
        socket.leave(room);
      }
    });

    socket.on("ping", (cb?: (msg: string) => void) => {
      if (cb) cb("pong");
    });

    // Support ticket events
    socket.on("join-ticket", async (ticketId: string) => {
      try {
        const ticket = await SupportTicketModel.findById(ticketId);
        if (!ticket) {
          socket.emit("error", "Ticket not found");
          return;
        }

        // Check access permissions
        const canAccess =
          (socket as any).user?.isSuperAdmin ||
          ticket.company.toString() === (socket as any).user?.companyId ||
          ticket.user.toString() === (socket as any).user?.id ||
          ticket.assignedTo?.toString() === (socket as any).user?.id;

        if (!canAccess) {
          socket.emit("error", "Access denied");
          return;
        }

        socket.join(`ticket:${ticketId}`);
        socket.emit("joined-ticket", ticketId);
      } catch (error) {
        socket.emit("error", "Failed to join ticket");
      }
    });

    socket.on("leave-ticket", (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
      socket.emit("left-ticket", ticketId);
    });

    socket.on("typing", (data: { ticketId: string; isTyping: boolean }) => {
      socket.to(`ticket:${data.ticketId}`).emit("user-typing", {
        userId: (socket as any).user?.id,
        isTyping: data.isTyping,
      });
    });

    socket.on(
      "new-message",
      async (data: { ticketId: string; message: any }) => {
        try {
          // Broadcast to all users in the ticket room
          socket.to(`ticket:${data.ticketId}`).emit("new-message", {
            ...data.message,
            sender: (socket as any).user?.id,
          });

          // Update message read status
          await SupportMessageModel.findByIdAndUpdate(data.message._id, {
            isRead: false,
          });
        } catch (error) {
          socket.emit("error", "Failed to send message");
        }
      }
    );

    socket.on("ticket-updated", (data: { ticketId: string; updates: any }) => {
      socket.to(`ticket:${data.ticketId}`).emit("ticket-updated", data.updates);
    });

    // Handle user activity tracking
    socket.on("activity", (data: { type: string; timestamp: Date }) => {
      const userId = (socket as any).user?.id;
      const companyId = (socket as any).user?.companyId;
      
      if (userId && onlineUsers.has(userId)) {
        const userInfo = onlineUsers.get(userId)!;
        userInfo.lastActivity = new Date();
        onlineUsers.set(userId, userInfo);
        
        // Emit user activity event
        emitToCompany(companyId, Events.UserActivity, {
          userId,
          activity: data.type,
          timestamp: data.timestamp || new Date()
        });
      }
    });

    // Handle real-time dashboard updates
    socket.on("request-dashboard-update", async () => {
      const companyId = (socket as any).user?.companyId;
      if (companyId) {
        // This would trigger a dashboard update with fresh data
        socket.emit(Events.DashboardUpdate, { 
          timestamp: new Date(),
          message: "Dashboard data refreshed"
        });
      }
    });

    // Handle system health checks
    socket.on("health-check", () => {
      socket.emit(Events.SystemHealth, {
        ...systemHealth,
        timestamp: new Date()
      });
    });

    socket.on("disconnect", () => {
      const userId = (socket as any).user?.id;
      const companyId = (socket as any).user?.companyId;
      
      console.log(`Socket disconnected: ${userId || "anonymous"}`);
      
      // Update system health
      systemHealth.activeConnections--;
      systemHealth.lastCheck = new Date();
      
      // Track user offline status
      if (userId && onlineUsers.has(userId)) {
        onlineUsers.delete(userId);
        systemHealth.connectedUsers = onlineUsers.size;
        
        // Emit user offline event
        emitToCompany(companyId, Events.UserOffline, { userId, timestamp: new Date() });
        
        // Update user's online status
        UserModel.findByIdAndUpdate(userId, { 
          isOnline: false,
          lastSeenAt: new Date()
        }).catch(console.error);
      }
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) {
    throw new Error(
      "Socket.IO server not initialized. Call initSocket() first."
    );
  }
  return io;
}

export function emitEvent(event: string, payload: any, room?: string) {
  const ioInstance = getIo();
  if (room) {
    ioInstance.to(room).emit(event, payload);
  } else {
    ioInstance.emit(event, payload);
  }
}

// Support-specific helper functions
export function emitToTicket(ticketId: string, event: string, payload: any) {
  const ioInstance = getIo();
  ioInstance.to(`ticket:${ticketId}`).emit(event, payload);
}

export function emitToCompany(companyId: string, event: string, payload: any) {
  const ioInstance = getIo();
  ioInstance.to(`company:${companyId}`).emit(event, payload);
}

export function emitToSuperAdmin(event: string, payload: any) {
  const ioInstance = getIo();
  ioInstance.to("super-admin").emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: any) {
  const ioInstance = getIo();
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

// Enhanced notification functions
export async function broadcastNotification(event: string, payload: any, options?: {
  userIds?: string[];
  companyIds?: string[];
  superAdminOnly?: boolean;
  excludeUsers?: string[];
}) {
  const ioInstance = getIo();
  
  if (options?.superAdminOnly) {
    ioInstance.to("super-admin").emit(event, payload);
  } else if (options?.companyIds) {
    options.companyIds.forEach(companyId => {
      ioInstance.to(`company:${companyId}`).emit(event, payload);
    });
  } else if (options?.userIds) {
    options.userIds.forEach(userId => {
      if (!options.excludeUsers?.includes(userId)) {
        ioInstance.to(`user:${userId}`).emit(event, payload);
      }
    });
  } else {
    ioInstance.emit(event, payload);
  }
}

// System health monitoring
export function getSystemHealth() {
  return {
    ...systemHealth,
    onlineUsers: Array.from(onlineUsers.entries()).map(([userId, info]) => ({
      userId,
      lastActivity: info.lastActivity,
      companyId: info.companyId
    }))
  };
}

export function broadcastSystemAlert(alert: {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  data?: any;
}) {
  const ioInstance = getIo();
  ioInstance.emit(Events.SystemAlert, {
    ...alert,
    timestamp: new Date()
  });
}

// Email delivery status updates
export function emitEmailStatus(userId: string, companyId: string, status: {
  emailId: string;
  status: 'sent' | 'failed' | 'delivered' | 'scheduled';
  message?: string;
  timestamp?: Date;
}) {
  const event = status.status === 'sent' ? Events.EmailSent :
                status.status === 'failed' ? Events.EmailFailed :
                status.status === 'delivered' ? Events.EmailDelivered :
                Events.EmailScheduled;
  
  emitToUser(userId, event, { ...status, timestamp: status.timestamp || new Date() });
  emitToCompany(companyId, event, { ...status, timestamp: status.timestamp || new Date() });
}

// Dashboard real-time updates
export function emitDashboardUpdate(companyId: string, updateType: string, data: any) {
  emitToCompany(companyId, Events.DashboardUpdate, {
    type: updateType,
    data,
    timestamp: new Date()
  });
}

export function emitStatsUpdate(companyId: string, stats: any) {
  emitToCompany(companyId, Events.StatsUpdate, {
    stats,
    timestamp: new Date()
  });
}
