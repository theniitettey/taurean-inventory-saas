import { Router } from "express";
import { SuperAdminController } from "../controllers/superAdmin.controller";
import { AuthMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// All routes require super admin authentication
router.use(AuthMiddleware);

// Company management
router.get("/companies", SuperAdminController.getAllCompanies);
router.get("/companies/:companyId", SuperAdminController.getCompanyDetails);
router.put("/companies/:companyId/status", SuperAdminController.updateCompanyStatus);
router.post(
  "/companies/:companyId/subscription/activate",
  SuperAdminController.activateCompanySubscription
);
router.post(
  "/companies/:companyId/subscription/deactivate",
  SuperAdminController.deactivateCompanySubscription
);

// User management
router.get("/users", SuperAdminController.getAllUsers);
router.get("/users/unassigned", SuperAdminController.getUnassignedUsers);
router.patch("/users/:userId/role", SuperAdminController.updateUserRole);
router.post(
  "/users/:userId/assign-company",
  SuperAdminController.assignUserToCompany
);
router.delete(
  "/users/:userId/remove-company",
  SuperAdminController.removeUserFromCompany
);

// System operations
router.get("/statistics", SuperAdminController.getSystemStatistics);
router.get("/activity", SuperAdminController.getRecentActivity);
router.get("/search/companies", SuperAdminController.searchCompanies);
router.get("/search/users", SuperAdminController.searchUsers);

// Enhanced super admin routes
// System statistics (enhanced)
router.get("/statistics-enhanced", SuperAdminController.getSystemStatistics);

// Company analytics
router.get("/company-analytics", SuperAdminController.getCompanyAnalytics);

// Company fee management
router.put("/company/fee", SuperAdminController.updateCompanyFee);

// Subscription management (enhanced)
router.post("/company/activate-subscription", SuperAdminController.activateCompanySubscription);
router.post("/company/deactivate-subscription", SuperAdminController.deactivateCompanySubscription);

// System management
router.get("/tax-management", SuperAdminController.getSystemTaxManagement);
router.get("/notifications", SuperAdminController.getSystemNotifications);
router.post("/send-notification", SuperAdminController.sendSystemNotification);
router.get("/health", SuperAdminController.getSystemHealth);

export default router;
