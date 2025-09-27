import { Request, Response } from "express";
import { sendSuccess, sendError, sendNotFound } from "../utils";
import { notificationService } from "../services/notification.service";
import { 
  createNotification,
  getNotifications,
  markAsRead as enhancedMarkAsRead,
  markAllAsRead as enhancedMarkAllAsRead,
  deleteNotification as enhancedDeleteNotification,
  getUnreadCount as enhancedGetUnreadCount,
  createBookingNotification,
  createRentalNotification,
  createPaymentNotification,
  createSubscriptionNotification,
} from "../services/enhancedNotification.service";
import { NotificationPreferencesModel } from "../models/notificationPreferences.model";

// Get user notifications
export async function getUserNotifications(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      sendError(res, "User not authenticated", null, 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await notificationService.getUserNotifications(userId, page, limit);

    sendSuccess(res, "User notifications retrieved", result);
  } catch (error: any) {
    sendError(res, "Failed to retrieve notifications", error.message);
  }
}

// Mark notification as read
export async function markAsRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.id;

    await notificationService.markAsRead(id, userId);

    sendSuccess(res, "Notification marked as read");
  } catch (error: any) {
    sendError(res, "Failed to mark notification as read", error.message);
  }
}

// Mark all notifications as read
export async function markAllAsRead(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id;

    await notificationService.markAllAsRead(userId);

    sendSuccess(res, "All notifications marked as read");
  } catch (error: any) {
    sendError(res, "Failed to mark all notifications as read", error.message);
  }
}

// Delete notification
export async function deleteNotification(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.id;

    await notificationService.deleteNotification(id, userId);

    sendSuccess(res, "Notification deleted");
  } catch (error: any) {
    sendError(res, "Failed to delete notification", error.message);
  }
}

// Get user notification preferences
export async function getPreferences(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      sendError(res, "User not authenticated", null, 401);
      return;
    }

    let preferences = await NotificationPreferencesModel.findOne({ user: userId });

    if (!preferences) {
      // Create default preferences if none exist
      preferences = await NotificationPreferencesModel.create({
        user: userId,
        email: true,
        push: true,
        sms: false,
        bookingNotifications: true,
        paymentNotifications: true,
        systemNotifications: true,
        marketingNotifications: false,
      });
    }

    sendSuccess(res, "Notification preferences retrieved", { preferences });
  } catch (error: any) {
    sendError(res, "Failed to retrieve preferences", error.message);
  }
}

// Update user notification preferences
export async function updatePreferences(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      sendError(res, "User not authenticated", null, 401);
      return;
    }

    const updateData = req.body;

    const preferences = await NotificationPreferencesModel.findOneAndUpdate(
      { user: userId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    sendSuccess(res, "Preferences updated", { preferences });
  } catch (error: any) {
    sendError(res, "Failed to update preferences", error.message);
  }
}

// Get unread notification count
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      sendError(res, "User not authenticated", null, 401);
      return;
    }

    const count = await notificationService.getUnreadCount(userId);

    sendSuccess(res, "Unread count retrieved", { count });
  } catch (error: any) {
    sendError(res, "Failed to get unread count", error.message);
  }
}

/**
 * Create a notification (enhanced)
 */
export const createNotificationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, title, message, category, data, sendEmail } = req.body;
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!type || !title || !message || !category) {
      sendError(res, "Type, title, message, and category are required");
      return;
    }

    const notification = await createNotification({
      companyId,
      userId,
      type,
      title,
      message,
      category,
      data,
      sendEmail: sendEmail || false,
    });

    sendSuccess(res, "Notification created successfully", notification);
  } catch (error) {
    sendError(res, "Failed to create notification", error);
  }
};

/**
 * Get notifications (enhanced)
 */
export const getNotificationsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = {
      type: req.query.type as string,
      category: req.query.category as string,
      isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      companyId: req.user?.companyId,
      userId: req.user?.id,
    };

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 10, 100),
    };

    const result = await getNotifications(filters, pagination);
    sendSuccess(res, "Notifications fetched successfully", result);
  } catch (error) {
    sendError(res, "Failed to fetch notifications", error);
  }
};

/**
 * Mark notification as read (enhanced)
 */
export const markAsReadController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId || !companyId) {
      sendError(res, "User authentication required");
      return;
    }

    const result = await enhancedMarkAsRead(id, userId);
    sendSuccess(res, "Notification marked as read", result);
  } catch (error) {
    if (error instanceof Error && error.message === "Notification not found") {
      sendNotFound(res, "Notification not found");
      return;
    }
    sendError(res, "Failed to mark notification as read", error);
  }
};

/**
 * Mark all notifications as read (enhanced)
 */
export const markAllAsReadController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId || !companyId) {
      sendError(res, "User authentication required");
      return;
    }

    const result = await enhancedMarkAllAsRead(userId, companyId);
    sendSuccess(res, "All notifications marked as read", result);
  } catch (error) {
    sendError(res, "Failed to mark all notifications as read", error);
  }
};

/**
 * Delete notification (enhanced)
 */
export const deleteNotificationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId || !companyId) {
      sendError(res, "User authentication required");
      return;
    }

    const result = await enhancedDeleteNotification(id, userId);
    sendSuccess(res, "Notification deleted successfully", result);
  } catch (error) {
    if (error instanceof Error && error.message === "Notification not found") {
      sendNotFound(res, "Notification not found");
      return;
    }
    sendError(res, "Failed to delete notification", error);
  }
};

/**
 * Get unread count (enhanced)
 */
export const getUnreadCountController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId || !companyId) {
      sendError(res, "User authentication required");
      return;
    }

    const result = await enhancedGetUnreadCount(userId, companyId);
    sendSuccess(res, "Unread count retrieved successfully", result);
  } catch (error) {
    sendError(res, "Failed to retrieve unread count", error);
  }
};

/**
 * Create booking notification
 */
export const createBookingNotificationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId, type } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      sendError(res, "Company authentication required");
      return;
    }

    if (!bookingId || !type) {
      sendError(res, "Booking ID and type are required");
      return;
    }

    const result = await createBookingNotification(bookingId, type);
    sendSuccess(res, "Booking notification created successfully", result);
  } catch (error) {
    sendError(res, "Failed to create booking notification", error);
  }
};

/**
 * Create rental notification
 */
export const createRentalNotificationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rentalId, type } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      sendError(res, "Company authentication required");
      return;
    }

    if (!rentalId || !type) {
      sendError(res, "Rental ID and type are required");
      return;
    }

    const result = await createRentalNotification(rentalId, type);
    sendSuccess(res, "Rental notification created successfully", result);
  } catch (error) {
    sendError(res, "Failed to create rental notification", error);
  }
};

/**
 * Create payment notification
 */
export const createPaymentNotificationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId, type } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      sendError(res, "Company authentication required");
      return;
    }

    if (!transactionId || !type) {
      sendError(res, "Transaction ID and type are required");
      return;
    }

    const result = await createPaymentNotification(transactionId, type);
    sendSuccess(res, "Payment notification created successfully", result);
  } catch (error) {
    sendError(res, "Failed to create payment notification", error);
  }
};

/**
 * Create subscription notification
 */
export const createSubscriptionNotificationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, type } = req.body;

    if (!companyId || !type) {
      sendError(res, "Company ID and type are required");
      return;
    }

    const result = await createSubscriptionNotification(companyId, type);
    sendSuccess(res, "Subscription notification created successfully", result);
  } catch (error) {
    sendError(res, "Failed to create subscription notification", error);
  }
};
