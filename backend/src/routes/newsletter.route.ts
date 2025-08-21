import { Router } from "express";
import { NewsletterController } from "../controllers/newsletter.controller";
import { AuthMiddleware, RequireActiveCompany, RequirePermissions } from "../middlewares/auth.middleware";

const router = Router();

// Public routes (no authentication required)
router.post("/subscribe", NewsletterController.subscribe);
router.post("/unsubscribe", NewsletterController.unsubscribe);
router.post("/resubscribe", NewsletterController.resubscribe);

// Public preference management (token-based)
router.get("/preferences/:token", NewsletterController.getPreferences);
router.put("/preferences/:token", NewsletterController.updatePreferences);

// Protected routes (require authentication)
router.use(AuthMiddleware);

// Subscriber management (admin/staff only)
router.get(
  "/subscribers",
  RequireActiveCompany(),
  RequirePermissions(["manageSettings"]),
  NewsletterController.getSubscribers
);

router.post(
  "/subscribers/import",
  RequireActiveCompany(),
  RequirePermissions(["manageSettings"]),
  NewsletterController.importSubscribers
);

// Campaign management (admin/staff only)
router.post(
  "/campaigns",
  RequireActiveCompany(),
  RequirePermissions(["manageSettings"]),
  NewsletterController.createCampaign
);

// Analytics (admin/staff only)
router.get(
  "/analytics",
  RequireActiveCompany(),
  RequirePermissions(["viewSettings"]),
  NewsletterController.getAnalytics
);

export default router;