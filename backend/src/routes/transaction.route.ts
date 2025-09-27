import { Router } from "express";
import { TransactionController } from "../controllers";
import { AuthMiddleware, AuthorizeRoles } from "../middlewares";
import {
  RequireActiveCompany,
  RequirePermissions,
  RequireCompanyContext,
} from "../middlewares/auth.middleware";
import { TransactionService } from "../services";
import {
  processCashPaymentController,
  processSplitPaymentController,
  processAdvancePaymentController,
  applyAdvancePaymentController,
  getAdvanceBalanceController,
  getSplitPaymentDetailsController,
  completeSplitPaymentController,
} from "../controllers/enhancedPayment.controller";

const router = Router();

// Webhook route - no authentication required (Paystack calls this)
router.post("/webhook", TransactionController.handlePaystackWebhookController);

// Payment verification route - public endpoint (no authentication required)
router.get("/verify/:reference", TransactionController.verifyPaymentController);

// Debug endpoint to check transaction data (temporary)
router.get("/debug", AuthMiddleware, (req, res) => {
  res.json({
    user: req.user,
    message: "Debug endpoint - check console for transaction data",
  });
});

// Debug endpoint to fix transaction company fields (temporary)
router.post("/debug/fix-company-fields", AuthMiddleware, async (req, res) => {
  try {
    const result = await TransactionService.fixTransactionCompanyFields();
    res.json({
      success: true,
      message: "Transaction company fields fixed",
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fix transaction company fields",
      error: error.message,
    });
  }
});

// All other payment routes require authentication
router.use(AuthMiddleware);

// List all transactions (company scope) - finance permissions
router.get(
  "/",
  RequireCompanyContext(),
  RequirePermissions(["accessFinancials"]),
  TransactionController.getAllTransactions
);

// Initialize payment and create transaction - authenticated users (no company context required)
router.post("/initialize", TransactionController.initializePaymentController);

// Get user transactions - no company context required for normal users
router.get("/user", TransactionController.getUserTransactions);

// Get payment details by reference - company finance
router.get(
  "/details/:reference",
  RequireCompanyContext(),
  RequirePermissions(["accessFinancials"]),
  TransactionController.getPaymentDetailsController
);

// List all banks
router.get("/banks", TransactionController.listBanks);

// Get mobile money details by bank code and account number
router.get(
  "/momo/:bankCode/:accountNumber",
  TransactionController.getBankMomoDetails
);

// Update subaccount details - admin only
router.put(
  "/subaccount/:subaccountCode",
  RequireCompanyContext(),
  RequirePermissions(["manageTransactions"]),
  TransactionController.updateSubAccount
);

// Get subaccount details - admin only
router.get(
  "/subaccount/:subaccountCode",
  RequireCompanyContext(),
  RequirePermissions(["manageTransactions"]),
  TransactionController.getSubAccountDetails
);

// Create transaction from existing payment - admin only (manual fallback)
router.post(
  "/create-transaction",
  RequireCompanyContext(),
  RequirePermissions(["manageTransactions"]),
  TransactionController.createTransactionFromPaymentController
);

// update transaction - staff/admin with manageTransactions
router.put(
  "/:id",
  RequireCompanyContext(),
  RequirePermissions(["manageTransactions"]),
  TransactionController.updateTransaction
);

// Enhanced payment routes
// Cash payment routes
router.post(
  "/cash",
  RequireCompanyContext(),
  RequirePermissions(["manageTransactions"]),
  processCashPaymentController
);

// Split payment routes
router.post(
  "/split",
  RequireCompanyContext(),
  RequirePermissions(["manageTransactions"]),
  processSplitPaymentController
);

router.get(
  "/split/:splitPaymentId",
  RequireCompanyContext(),
  RequirePermissions(["accessFinancials"]),
  getSplitPaymentDetailsController
);

router.put(
  "/split/:splitPaymentId/complete",
  RequireCompanyContext(),
  RequirePermissions(["manageTransactions"]),
  completeSplitPaymentController
);

// Advance payment routes
router.post(
  "/advance",
  RequireCompanyContext(),
  processAdvancePaymentController
);

router.post(
  "/advance/apply",
  RequireCompanyContext(),
  RequirePermissions(["manageTransactions"]),
  applyAdvancePaymentController
);

router.get(
  "/advance/balance",
  RequireCompanyContext(),
  getAdvanceBalanceController
);

export default router;
