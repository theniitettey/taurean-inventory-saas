import { Request, Response } from "express";
import { SuperAdminService } from "../services/superAdmin.service";
import { 
  getSystemStatistics,
  getCompanyAnalytics,
  updateCompanyFee,
  activateCompanySubscription,
  deactivateCompanySubscription,
  getSystemTaxManagement,
  getSystemNotifications,
  sendSystemNotification,
  getSystemHealth,
} from "../services/superAdminEnhanced.service";
import { sendError, sendSuccess } from "../utils/response.util";

export class SuperAdminController {
  // Get all companies with statistics
  static async getAllCompanies(req: Request, res: Response) {
    try {
      const companies = await SuperAdminService.getAllCompanies();
      sendSuccess(res, "Companies retrieved successfully", { companies });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }

  // Get company details
  static async getCompanyDetails(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const details = await SuperAdminService.getCompanyDetails(companyId);
      sendSuccess(res, "Company details retrieved successfully", details);
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }

  // Update company status
  static async updateCompanyStatus(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const { status } = req.body;

      if (!status) {
        sendError(res, "Status is required", null, 400);
        return;
      }

      const company = await SuperAdminService.updateCompanyStatus(companyId, status);
      sendSuccess(res, "Company status updated successfully", { company });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }


  // Get all users
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await SuperAdminService.getAllUsers();
      sendSuccess(res, "Users retrieved successfully", { users });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }

  // Get unassigned users
  static async getUnassignedUsers(req: Request, res: Response) {
    try {
      const users = await SuperAdminService.getUnassignedUsers();
      sendSuccess(res, "Unassigned users retrieved successfully", { users });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }

  // Update user role
  static async updateUserRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role) {
        sendError(res, "Role is required", null, 400);
        return;
      }

      const user = await SuperAdminService.updateUserRole(userId, role);
      sendSuccess(res, "User role updated successfully", { user });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }

  // Assign user to company
  static async assignUserToCompany(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { companyId } = req.body;

      if (!companyId) {
        sendError(res, "Company ID is required", null, 400);
        return;
      }

      const user = await SuperAdminService.assignUserToCompany(
        userId,
        companyId
      );
      sendSuccess(res, "User assigned to company successfully", { user });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }

  // Remove user from company
  static async removeUserFromCompany(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await SuperAdminService.removeUserFromCompany(userId);
      sendSuccess(res, "User removed from company successfully", { user });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }


  // Get recent activity
  static async getRecentActivity(req: Request, res: Response) {
    try {
      const { limit } = req.query;
      const activity = await SuperAdminService.getRecentActivity(
        limit ? parseInt(limit as string) : 20
      );
      sendSuccess(res, "Recent activity retrieved successfully", { activity });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }

  // Search companies
  static async searchCompanies(req: Request, res: Response) {
    try {
      const { query } = req.query;
      if (!query) {
        sendError(res, "Search query is required", null, 400);
        return;
      }

      const companies = await SuperAdminService.searchAllCompanies(
        query as string
      );
      sendSuccess(res, "Companies search completed", { companies });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }

  // Search users
  static async searchUsers(req: Request, res: Response) {
    try {
      const { query } = req.query;
      if (!query) {
        sendError(res, "Search query is required", null, 400);
        return;
      }

      const users = await SuperAdminService.searchAllUsers(query as string);
      sendSuccess(res, "Users search completed", { users });
    } catch (error: any) {
      sendError(res, error.message, null, 400);
    }
  }

  // Enhanced Super Admin Functions

  /**
   * Get system statistics
   */
  static async getSystemStatistics(req: Request, res: Response) {
    try {
      const statistics = await getSystemStatistics();
      sendSuccess(res, "System statistics fetched successfully", statistics);
    } catch (error: any) {
      sendError(res, "Failed to fetch system statistics", error);
    }
  }

  /**
   * Get company analytics
   */
  static async getCompanyAnalytics(req: Request, res: Response) {
    try {
      const analytics = await getCompanyAnalytics();
      sendSuccess(res, "Company analytics fetched successfully", analytics);
    } catch (error: any) {
      sendError(res, "Failed to fetch company analytics", error);
    }
  }

  /**
   * Update company fee
   */
  static async updateCompanyFee(req: Request, res: Response) {
    try {
      const { companyId, feePercent } = req.body;

      if (!companyId || feePercent === undefined) {
        sendError(res, "Company ID and fee percentage are required", null, 400);
        return;
      }

      const result = await updateCompanyFee(companyId, feePercent);
      sendSuccess(res, "Company fee updated successfully", result);
    } catch (error: any) {
      sendError(res, "Failed to update company fee", error);
    }
  }

  /**
   * Activate company subscription
   */
  static async activateCompanySubscription(req: Request, res: Response) {
    try {
      const { companyId, planId, duration } = req.body;

      if (!companyId || !planId) {
        sendError(res, "Company ID and plan ID are required", null, 400);
        return;
      }

      const result = await activateCompanySubscription(companyId, planId);
      sendSuccess(res, "Company subscription activated successfully", result);
    } catch (error: any) {
      sendError(res, "Failed to activate company subscription", error);
    }
  }

  /**
   * Deactivate company subscription
   */
  static async deactivateCompanySubscription(req: Request, res: Response) {
    try {
      const { companyId } = req.body;

      if (!companyId) {
        sendError(res, "Company ID is required", null, 400);
        return;
      }

      const result = await deactivateCompanySubscription(companyId);
      sendSuccess(res, "Company subscription deactivated successfully", result);
    } catch (error: any) {
      sendError(res, "Failed to deactivate company subscription", error);
    }
  }

  /**
   * Get system tax management
   */
  static async getSystemTaxManagement(req: Request, res: Response) {
    try {
      const result = await getSystemTaxManagement();
      sendSuccess(res, "System tax management data fetched successfully", result);
    } catch (error: any) {
      sendError(res, "Failed to fetch system tax management data", error);
    }
  }

  /**
   * Get system notifications
   */
  static async getSystemNotifications(req: Request, res: Response) {
    try {
      const result = await getSystemNotifications();
      sendSuccess(res, "System notifications fetched successfully", result);
    } catch (error: any) {
      sendError(res, "Failed to fetch system notifications", error);
    }
  }

  /**
   * Send system notification
   */
  static async sendSystemNotification(req: Request, res: Response) {
    try {
      const { title, message, type, targetCompanies, targetUsers } = req.body;

      if (!title || !message || !type) {
        sendError(res, "Title, message, and type are required", null, 400);
        return;
      }

      const result = await sendSystemNotification({
        title,
        message,
        type,
        category: "announcement" as const,
      });

      sendSuccess(res, "System notification sent successfully", result);
    } catch (error: any) {
      sendError(res, "Failed to send system notification", error);
    }
  }

  /**
   * Get system health
   */
  static async getSystemHealth(req: Request, res: Response) {
    try {
      const result = await getSystemHealth();
      sendSuccess(res, "System health data fetched successfully", result);
    } catch (error: any) {
      sendError(res, "Failed to fetch system health data", error);
    }
  }
}
