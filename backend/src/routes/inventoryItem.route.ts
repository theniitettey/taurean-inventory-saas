import { Router } from "express";
import { InventoryItemController } from "../controllers";
import { AuthMiddleware, fileFilter, storage } from "../middlewares";
import multer from "multer";
import {
  RequireActiveCompany,
  RequirePermissions,
} from "../middlewares/auth.middleware";
import {
  getInventoryWithRentalStatusController,
  getInventoryItemWithRentalHistoryController,
  rentInventoryItemController,
  returnInventoryItemController,
  getInventoryStatisticsController,
  getLowStockItemsController,
  getMaintenanceDueItemsController,
} from "../controllers/inventoryItem.controller";

const uploadConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files
  },
};

const router = Router();

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
// Get inventory with rental status
router.get(
  "/with-rental-status",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  getInventoryWithRentalStatusController
);

// Get inventory item with rental history
router.get(
  "/:id/rental-history",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  getInventoryItemWithRentalHistoryController
);

// Rent inventory item
router.post(
  "/:id/rent",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  rentInventoryItemController
);

// Return inventory item (enhanced)
router.post(
  "/:id/return-enhanced",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  returnInventoryItemController
);

// Get inventory statistics
router.get(
  "/statistics",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  getInventoryStatisticsController
);

// Get low stock items (enhanced)
router.get(
  "/low-stock-enhanced",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  getLowStockItemsController
);

// Get maintenance due items
router.get(
  "/maintenance-due",
  AuthMiddleware,
  RequireActiveCompany(),
  RequirePermissions(["manageInventory"]),
  getMaintenanceDueItemsController
);

export default router;
