import { NotificationDocument, NotificationModel } from "../models";
import { NotificationPreferencesModel } from "../models/notificationPreferences.model";
import { UserModel } from "../models/user.model";
import { emitEvent, emitToUser, emitToCompany } from "../realtime/socket";
import { Events } from "../realtime/events";
import { emailService } from "./email.service";

interface NotificationPayload {
  type?: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  data?: any;
  priority?: "low" | "normal" | "high" | "urgent";
  category?: string;
  actionUrl?: string;
  expiresAt?: Date;
}

interface NotificationOptions {
  sendEmail?: boolean;
  persistent?: boolean;
  channels?: ("inApp" | "email" | "push")[];
}

export async function notifyUser(
  userId: string, 
  payload: NotificationPayload,
  options: NotificationOptions = {}
): Promise<NotificationDocument> {
  // Get user preferences
  const preferences = await NotificationPreferencesModel.findOne({ userId });
  const user = await UserModel.findById(userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user wants this type of notification
  const shouldSend = checkNotificationPreferences(preferences, payload.category, options.channels);
  
  if (!shouldSend.inApp && !shouldSend.email) {
    console.log(`Notification blocked by user preferences for user ${userId}`);
    return null as any;
  }

  // Create in-app notification
  let notification: NotificationDocument | null = null;
  if (shouldSend.inApp) {
    notification = await NotificationModel.create({
      user: userId,
      type: payload.type || "info",
      title: payload.title,
      message: payload.message,
      data: payload.data,
      priority: payload.priority || "normal",
      category: payload.category,
      actionUrl: payload.actionUrl,
      expiresAt: payload.expiresAt,
      isRead: false,
    } as any);

    try {
      emitToUser(userId, Events.NotificationUser, { 
        id: notification._id, 
        notification: notification.toObject() 
      });
    } catch (error) {
      console.error("Failed to emit notification:", error);
    }
  }

  // Send email notification if requested and allowed
  if (shouldSend.email && (options.sendEmail || payload.priority === "urgent")) {
    try {
      await emailService.sendCustomEmail(
        user.email,
        payload.title,
        payload.message,
        (user as any).company?.toString()
      );
    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  }

  return notification as any;
}

export async function notifyCompany(
  companyId: string, 
  payload: NotificationPayload,
  options: NotificationOptions = {}
): Promise<NotificationDocument> {
  const doc = await NotificationModel.create({
    company: companyId,
    type: payload.type || "info",
    title: payload.title,
    message: payload.message,
    data: payload.data,
    priority: payload.priority || "normal",
    category: payload.category,
    actionUrl: payload.actionUrl,
    expiresAt: payload.expiresAt,
    isRead: false,
  } as any);

  try {
    emitToCompany(companyId, Events.NotificationCompany, { 
      id: doc._id, 
      notification: doc.toObject() 
    });
  } catch (error) {
    console.error("Failed to emit company notification:", error);
  }

  // If it's urgent, also notify all company users individually
  if (payload.priority === "urgent") {
    const companyUsers = await UserModel.find({ 
      company: companyId, 
      isDeleted: false 
    }).select('_id email');

    for (const user of companyUsers) {
      await notifyUser(user._id.toString(), payload, options);
    }
  }

  return doc as any;
}

export async function notifyMultipleUsers(
  userIds: string[], 
  payload: NotificationPayload,
  options: NotificationOptions = {}
): Promise<NotificationDocument[]> {
  const notifications = await Promise.allSettled(
    userIds.map(userId => notifyUser(userId, payload, options))
  );

  return notifications
    .filter((result): result is PromiseFulfilledResult<NotificationDocument> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);
}

export async function markNotificationAsRead(notificationId: string, userId?: string): Promise<boolean> {
  try {
    const filter: any = { _id: notificationId };
    if (userId) {
      filter.user = userId;
    }

    const notification = await NotificationModel.findOneAndUpdate(
      filter,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (notification) {
      // Emit read event
      if (notification.user) {
        emitToUser(notification.user.toString(), Events.NotificationRead, {
          notificationId,
          readAt: new Date()
        });
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  try {
    const result = await NotificationModel.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    if (result.modifiedCount > 0) {
      emitToUser(userId, Events.NotificationRead, {
        allRead: true,
        count: result.modifiedCount,
        readAt: new Date()
      });
    }

    return result.modifiedCount;
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return 0;
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    return await NotificationModel.countDocuments({
      user: userId,
      isRead: false,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });
  } catch (error) {
    console.error("Failed to get unread notification count:", error);
    return 0;
  }
}

export async function cleanupExpiredNotifications(): Promise<number> {
  try {
    const result = await NotificationModel.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error("Failed to cleanup expired notifications:", error);
    return 0;
  }
}

function checkNotificationPreferences(preferences: any, category?: string, channels?: ("inApp" | "email" | "push")[]) {
  const defaultPrefs = { inApp: true, email: true, push: false };
  
  if (!preferences) {
    return defaultPrefs;
  }

  const result = { inApp: true, email: true, push: false };

  // Check global preferences
  if (preferences.inApp === false) result.inApp = false;
  if (preferences.email === false) result.email = false;
  if (preferences.push === false) result.push = false;

  // Check category-specific preferences
  if (category && preferences.categories?.[category]) {
    const categoryPrefs = preferences.categories[category];
    if (categoryPrefs.inApp === false) result.inApp = false;
    if (categoryPrefs.email === false) result.email = false;
    if (categoryPrefs.push === false) result.push = false;
  }

  // Override with specific channels if provided
  if (channels && channels.length > 0) {
    result.inApp = channels.includes("inApp");
    result.email = channels.includes("email");
    result.push = channels.includes("push");
  }

  return result;
}