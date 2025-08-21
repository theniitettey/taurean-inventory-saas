import { Router } from "express";
import * as EmailController from "../controllers/email.controller";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { RequireActiveCompany, RequirePermissions } from "../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(AuthMiddleware);

// Test email configuration - admin only
router.get(
  "/test-config",
  RequireActiveCompany(),
  RequirePermissions(["manageSettings"]),
  EmailController.testEmailConfiguration
);

// Send test email - admin only
router.post(
  "/test",
  RequireActiveCompany(),
  RequirePermissions(["manageSettings"]),
  EmailController.sendTestEmail
);

// Send welcome email to specific user - admin/staff
router.post(
  "/welcome/:userId",
  RequireActiveCompany(),
  RequirePermissions(["manageUsers"]),
  EmailController.sendWelcomeEmail
);

// Send invoice email - admin/staff with transaction permissions
router.post(
  "/invoice/:invoiceId",
  RequireActiveCompany(),
  RequirePermissions(["manageTransactions"]),
  EmailController.sendInvoiceEmail
);

// Send receipt email - admin/staff with transaction permissions
router.post(
  "/receipt/:receiptId",
  RequireActiveCompany(),
  RequirePermissions(["manageTransactions"]),
  EmailController.sendReceiptEmail
);

// Send booking confirmation - admin/staff with booking permissions
router.post(
  "/booking-confirmation/:bookingId",
  RequireActiveCompany(),
  RequirePermissions(["manageBookings"]),
  EmailController.sendBookingConfirmation
);

// Send booking reminder - admin/staff with booking permissions
router.post(
  "/booking-reminder/:bookingId",
  RequireActiveCompany(),
  RequirePermissions(["manageBookings"]),
  EmailController.sendBookingReminder
);

// Send bulk email - admin only
router.post(
  "/bulk",
  RequireActiveCompany(),
  RequirePermissions(["manageSettings"]),
  EmailController.sendBulkEmail
);

// Email scheduling endpoints
router.post(
  "/schedule",
  RequireActiveCompany(),
  RequirePermissions(["manageSettings"]),
  EmailController.scheduleEmailEndpoint
);

router.delete(
  "/schedule/:jobId",
  RequireActiveCompany(),
  RequirePermissions(["manageSettings"]),
  EmailController.cancelScheduledEmailEndpoint
);

router.get(
  "/scheduled",
  RequireActiveCompany(),
  RequirePermissions(["viewSettings"]),
  EmailController.getScheduledEmailsEndpoint
);

router.get(
  "/analytics",
  RequireActiveCompany(),
  RequirePermissions(["viewSettings"]),
  EmailController.getEmailAnalytics
);

// Email settings management
router.get(
  "/settings/:companyId",
  RequirePermissions(["viewSettings"]),
  EmailController.getEmailSettings
);

router.put(
  "/settings/:companyId",
  RequirePermissions(["manageSettings"]),
  EmailController.updateEmailSettings
);

export default router;