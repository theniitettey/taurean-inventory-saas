import { Router } from "express";
import { InventoryItemController } from "../controllers";
import { AuthMiddleware, fileFilter, storage } from "../middlewares";
import multer from "multer";
import {
  RequireActiveCompany,
  RequirePermissions,
  AuthorizeRoles,
} from "../middlewares/auth.middleware";

const uploadConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files
  },
};

const router = Router();

// Define middleware combinations
const adminOnly = [AuthMiddleware, AuthorizeRoles("admin")];
const staffAndAbove = [AuthMiddleware, AuthorizeRoles("staff", "admin")];
const allUsers = [AuthMiddleware];

// Get all inventory items (public listing)
router.get("/", InventoryItemController.getAllInventoryItems);

// Company-specific: Get inventory items for the authenticated user's company
router.get(
  "/company",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  InventoryItemController.getCompanyInventoryItems
);

// Low stock (internal)
router.get(
  "/low-stock",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  InventoryItemController.getLowStockItems
);

// Public get item
router.get("/:id", InventoryItemController.getInventoryItemById);

// Create new inventory item
router.post(
  "/",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  multer(uploadConfig).array("files"),
  InventoryItemController.createInventoryItem
);

// Update inventory item by ID
router.put(
  "/:id",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  multer(uploadConfig).array("files"),
  InventoryItemController.updateInventoryItem
);

// Return an inventory item
router.post(
  "/:id/return",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  InventoryItemController.returnInventoryItem
);

// Soft delete inventory item by ID
router.delete(
  "/:id",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  InventoryItemController.deleteInventoryItem
);

// Restore soft deleted inventory item by ID
router.post(
  "/:id/restore",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  InventoryItemController.restoreInventoryItem
);

// Add maintenance schedule to inventory item
router.post(
  "/:id/maintenance",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  InventoryItemController.addMaintenanceSchedule
);

// Enhanced inventory routes
router.get(
  "/with-rental-status",
  staffAndAbove,
  RequireActiveCompany(),
  InventoryItemController.getInventoryWithRentalStatusController
);

router.get(
  "/:id/rental-history",
  staffAndAbove,
  RequireActiveCompany(),
  InventoryItemController.getInventoryItemWithRentalHistoryController
);

router.post(
  "/:id/rent",
  staffAndAbove,
  RequireActiveCompany(),
  InventoryItemController.rentInventoryItemController
);

router.post(
  "/:id/return",
  staffAndAbove,
  RequireActiveCompany(),
  InventoryItemController.returnInventoryItemController
);

router.get(
  "/statistics",
  staffAndAbove,
  RequireActiveCompany(),
  InventoryItemController.getInventoryStatisticsController
);

router.get(
  "/low-stock",
  staffAndAbove,
  RequireActiveCompany(),
  InventoryItemController.getLowStockItemsController
);

router.get(
  "/maintenance-due",
  staffAndAbove,
  RequireActiveCompany(),
  InventoryItemController.getMaintenanceDueItemsController
);

export default router;
