import { Router } from "express";
import * as NotificationController from "../controllers/notification.controller";
import {
  AuthMiddleware,
  RequireActiveCompany,
  RequirePermissions,
} from "../middlewares/auth.middleware";
import {
  createNotificationController,
  getNotificationsController,
  markAsReadController,
  markAllAsReadController,
  deleteNotificationController,
  getUnreadCountController,
  createBookingNotificationController,
  createRentalNotificationController,
  createPaymentNotificationController,
  createSubscriptionNotificationController,
} from "../controllers/enhancedNotification.controller";

const router = Router();

// User notification routes
router.get(
  "/user",
  AuthMiddleware,
  NotificationController.getUserNotifications
);
router.patch("/:id/read", AuthMiddleware, NotificationController.markAsRead);
router.patch("/read-all", AuthMiddleware, NotificationController.markAllAsRead);
router.delete(
  "/:id",
  AuthMiddleware,
  NotificationController.deleteNotification
);

// Notification preferences
router.get(
  "/preferences",
  AuthMiddleware,
  NotificationController.getPreferences
);
router.patch(
  "/preferences",
  AuthMiddleware,
  NotificationController.updatePreferences
);

// Unread count
router.get(
  "/unread-count",
  AuthMiddleware,
  NotificationController.getUnreadCount
);

// Enhanced notification routes
// Create notification
router.post(
  "/",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageEmails"]),
  createNotificationController
);

// Get notifications with pagination
router.get(
  "/enhanced",
  AuthMiddleware,
  RequireActiveCompany(),
  getNotificationsController
);

// Mark notification as read (enhanced)
router.put(
  "/:id/read-enhanced",
  AuthMiddleware,
  RequireActiveCompany(),
  markAsReadController
);

// Mark all notifications as read (enhanced)
router.put(
  "/mark-all-read-enhanced",
  AuthMiddleware,
  RequireActiveCompany(),
  markAllAsReadController
);

// Delete notification (enhanced)
router.delete(
  "/:id/enhanced",
  AuthMiddleware,
  RequireActiveCompany(),
  deleteNotificationController
);

// Get unread count (enhanced)
router.get(
  "/unread-count-enhanced",
  AuthMiddleware,
  RequireActiveCompany(),
  getUnreadCountController
);

// Specific notification types
router.post(
  "/booking",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageEmails"]),
  createBookingNotificationController
);

router.post(
  "/rental",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageEmails"]),
  createRentalNotificationController
);

router.post(
  "/payment",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageEmails"]),
  createPaymentNotificationController
);

router.post(
  "/subscription",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageEmails"]),
  createSubscriptionNotificationController
);

export default router;
