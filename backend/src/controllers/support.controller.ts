import { Request, Response } from "express";
import { SupportTicketModel } from "../models/supportTicket.model";
import { SupportMessageModel } from "../models/supportMessage.model";
import { UserModel } from "../models/user.model";
import { CompanyModel } from "../models/company.model";
import { sendError, sendSuccess } from "../utils";
import { emitToCompany, emitToSuperAdmin, emitToUser } from "../realtime/socket";
import { Events } from "../realtime/events";
import { notifyUser, notifyCompany } from "../services/notification.service";

interface TicketFilters {
  status?: string[];
  priority?: string[];
  category?: string[];
  assignedTo?: string[];
  company?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  searchQuery?: string;
  tags?: string[];
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class SupportController {
  // Create a new support ticket
  static async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, category, priority, companyId: requestedCompanyId } = req.body;
      const userId = (req.user as any)?.id;
      const userCompanyId = (req.user as any)?.companyId;
      const userRole = (req.user as any)?.role;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;
      const files = (req as any).files;

      if (!userId) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      // Determine which company the ticket belongs to
      let targetCompanyId = requestedCompanyId;
      
      // If user is admin/staff/super admin, they can create tickets for their company
      if (["admin", "staff"].includes(userRole) || isSuperAdmin) {
        targetCompanyId = userCompanyId;
      } else if (!requestedCompanyId) {
        // Normal users must specify which company they're creating a ticket for
        sendError(res, "Company ID is required for support tickets", null, 400);
        return;
      }

      const ticketData = {
        title,
        description,
        category: category || "general",
        priority: priority || "medium",
        company: targetCompanyId,
        user: userId,
      };

      const ticket = new SupportTicketModel(ticketData);
      await ticket.save();

      // Create initial system message
      const systemMessage = new SupportMessageModel({
        ticket: ticket._id,
        sender: userId,
        senderType: "system",
        message: `Support ticket ${ticket.ticketNumber} has been created. A staff member will respond shortly.`,
      });
      await systemMessage.save();

      // If files were uploaded, create a message with attachments
      if (files && files.length > 0) {
        const attachmentPaths = files.map((file: any) => file.path);
        const attachmentMessage = new SupportMessageModel({
          ticket: ticket._id,
          sender: userId,
          senderType: "user",
          message: "Initial ticket with attachments",
          messageType: "file",
          attachments: attachmentPaths,
        });
        await attachmentMessage.save();
      }

      // Populate user and company details
      await ticket.populate([
        { path: "user", select: "username email firstName lastName" },
        { path: "company", select: "name" },
      ]);

      sendSuccess(res, "Support ticket created successfully", ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      sendError(res, "Failed to create support ticket", error);
    }
  }

  // Get all tickets for a user
  static async getUserTickets(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const userCompanyId = (req.user as any)?.companyId;
      const userRole = (req.user as any)?.role;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!userId) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      let query: any = { user: userId, isDeleted: false };

      // If user is admin/staff/super admin, show tickets from their company
      if (["admin", "staff"].includes(userRole) || isSuperAdmin) {
        if (userCompanyId) {
          query.company = userCompanyId;
        }
      } else {
        // Normal users can see tickets they created for any company
        // No company filter needed
      }

      const tickets = await SupportTicketModel.find(query)
        .populate("company", "name")
        .populate("assignedTo", "username firstName lastName")
        .sort({ updatedAt: -1 });

      sendSuccess(res, "Tickets retrieved successfully", tickets);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      sendError(res, "Failed to fetch tickets", error);
    }
  }

  // Get all tickets for staff (admin/staff roles)
  static async getStaffTickets(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const userCompanyId = (req.user as any)?.companyId;
      const userRole = (req.user as any)?.role;

      if (!userId) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      // Check if user has staff role
      if (!["admin", "staff"].includes(userRole)) {
        sendError(res, "Insufficient permissions", null, 403);
        return;
      }

      let query: any = { isDeleted: false };

      // If staff has a company, show tickets from their company
      if (userCompanyId) {
        query.company = userCompanyId;
      }

      const tickets = await SupportTicketModel.find(query)
        .populate("user", "username firstName lastName email")
        .populate("company", "name")
        .populate("assignedTo", "username firstName lastName")
        .sort({ updatedAt: -1 });

      sendSuccess(res, "Tickets retrieved successfully", tickets);
    } catch (error) {
      console.error("Error fetching staff tickets:", error);
      sendError(res, "Failed to fetch tickets", error);
    }
  }

  // Get all tickets for super admin (Taurean IT)
  static async getSuperAdminTickets(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!isSuperAdmin) {
        sendError(res, "Access denied", null, 403);
        return;
      }

      const tickets = await SupportTicketModel.find({
        isDeleted: false,
      })
        .populate("user", "username firstName lastName email")
        .populate("company", "name")
        .populate("assignedTo", "username firstName lastName")
        .sort({ updatedAt: -1 });

      sendSuccess(res, "Tickets retrieved successfully", tickets);
    } catch (error) {
      console.error("Error fetching super admin tickets:", error);
      sendError(res, "Failed to fetch tickets", error);
    }
  }

  // Get ticket details with messages
  static async getTicketDetails(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const userId = (req.user as any)?.id;
      const companyId = (req.user as any)?.companyId;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!userId) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      const ticket = await SupportTicketModel.findOne({
        _id: ticketId,
        isDeleted: false,
      }).populate([
        { path: "user", select: "username firstName lastName email" },
        { path: "company", select: "name" },
        { path: "assignedTo", select: "username firstName lastName" },
      ]);

      if (!ticket) {
        sendError(res, "Ticket not found", null, 404);
        return;
      }

      // Check access permissions
      const canAccess =
        isSuperAdmin ||
        ticket.company._id.toString() === companyId ||
        ticket.user._id.toString() === userId ||
        ticket.assignedTo?._id.toString() === userId;

      if (!canAccess) {
        sendError(res, "Access denied", null, 403);
        return;
      }

      // Get messages
      const messages = await SupportMessageModel.find({
        ticket: ticketId,
        isDeleted: false,
      })
        .populate("sender", "username firstName lastName")
        .sort({ createdAt: 1 });

      // Mark messages as read for the current user
      const unreadMessages = messages.filter(
        (msg) => !msg.readBy.includes(userId as any)
      );

      if (unreadMessages.length > 0) {
        await SupportMessageModel.updateMany(
          { _id: { $in: unreadMessages.map((msg) => msg._id) } },
          { $addToSet: { readBy: userId } }
        );
      }

      sendSuccess(res, "Ticket details retrieved successfully", {
        ticket,
        messages,
      });
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      sendError(res, "Failed to fetch ticket details", error);
    }
  }

  // Send a message to a ticket
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { message, messageType = "text" } = req.body;
      const userId = (req.user as any)?.id;
      const companyId = (req.user as any)?.companyId;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;
      const files = (req as any).files;

      if (!userId || !message) {
        sendError(res, "Missing required fields", null, 400);
        return;
      }

      // Verify ticket exists and user has access
      const ticket = await SupportTicketModel.findOne({
        _id: ticketId,
        isDeleted: false,
      });

      if (!ticket) {
        sendError(res, "Ticket not found", null, 404);
        return;
      }

      // Check access permissions
      const canAccess =
        isSuperAdmin ||
        ticket.company.toString() === companyId ||
        ticket.user.toString() === userId ||
        ticket.assignedTo?.toString() === userId;

      if (!canAccess) {
        sendError(res, "Access denied", null, 403);
        return;
      }

      // Determine sender type
      const user = await UserModel.findById(userId);
      const senderType =
        user?.isSuperAdmin || ["admin", "staff"].includes(user?.role || "")
          ? "staff"
          : "user";

      // Determine message type based on content and files
      let finalMessageType = messageType;
      let attachments: string[] | undefined;

      if (files && files.length > 0) {
        finalMessageType = "file";
        attachments = files.map((file: any) => file.path);
      }

      const messageData = {
        ticket: ticketId,
        sender: userId,
        senderType,
        message,
        messageType: finalMessageType,
        attachments,
      };

      const newMessage = new SupportMessageModel(messageData);
      await newMessage.save();

      // Update ticket status if it was closed and a new message is sent
      if (ticket.status === "closed") {
        ticket.status = "open";
        await ticket.save();
      }

      // Update ticket updatedAt
      ticket.updatedAt = new Date();
      await ticket.save();

      // Populate sender details
      await newMessage.populate("sender", "username firstName lastName");

      sendSuccess(res, "Message sent successfully", newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      sendError(res, "Failed to send message", error);
    }
  }

  // Update ticket status
  static async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { status, assignedTo } = req.body;
      const userId = (req.user as any)?.id;
      const companyId = (req.user as any)?.companyId;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!userId) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      const ticket = await SupportTicketModel.findOne({
        _id: ticketId,
        isDeleted: false,
      });

      if (!ticket) {
        sendError(res, "Ticket not found", null, 404);
        return;
      }

      // Check permissions
      const canUpdate = isSuperAdmin || ticket.company.toString() === companyId;

      if (!canUpdate) {
        sendError(res, "Access denied", null, 403);
        return;
      }

      // Update ticket
      const updateData: any = { status };

      if (assignedTo) {
        updateData.assignedTo = assignedTo;
      }

      if (status === "resolved") {
        updateData.resolvedAt = new Date();
      } else if (status === "closed") {
        updateData.closedAt = new Date();
      }

      const updatedTicket = await SupportTicketModel.findByIdAndUpdate(
        ticketId,
        updateData,
        { new: true }
      ).populate([
        { path: "user", select: "username firstName lastName email" },
        { path: "company", select: "name" },
        { path: "assignedTo", select: "username firstName lastName" },
      ]);

      // Create system message for status change
      const systemMessage = new SupportMessageModel({
        ticket: ticketId,
        sender: userId,
        senderType: "system",
        message: `Ticket status updated to ${status}${
          assignedTo ? ` and assigned to staff` : ""
        }.`,
      });
      await systemMessage.save();

      sendSuccess(res, "Ticket updated successfully", updatedTicket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      sendError(res, "Failed to update ticket", error);
    }
  }

  // Get available staff for assignment
  static async getAvailableStaff(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req.user as any)?.companyId;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!companyId && !isSuperAdmin) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      let query: any = { isDeleted: false };

      if (!isSuperAdmin) {
        query.company = companyId;
      }

      const staff = await UserModel.find({
        ...query,
        role: { $in: ["admin", "staff"] },
      }).select("username firstName lastName email role");

      sendSuccess(res, "Staff retrieved successfully", staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      sendError(res, "Failed to fetch staff", error);
    }
  }

  // Advanced ticket filtering and pagination
  static async getTicketsAdvanced(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const userCompanyId = (req.user as any)?.companyId;
      const userRole = (req.user as any)?.role;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!userId) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      // Parse filters from query parameters
      const filters: TicketFilters = {
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        priority: req.query.priority ? (req.query.priority as string).split(',') : undefined,
        category: req.query.category ? (req.query.category as string).split(',') : undefined,
        assignedTo: req.query.assignedTo ? (req.query.assignedTo as string).split(',') : undefined,
        company: req.query.company ? (req.query.company as string).split(',') : undefined,
        searchQuery: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      };

      if (req.query.startDate || req.query.endDate) {
        filters.dateRange = {
          start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          end: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        };
      }

      // Parse pagination options
      const pagination: PaginationOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 20,
        sortBy: req.query.sortBy as string || 'updatedAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      };

      // Build MongoDB query
      let query: any = { isDeleted: false };

      // Apply access control
      if (isSuperAdmin) {
        // Super admin can see all tickets
      } else if (["admin", "staff"].includes(userRole)) {
        // Admin/staff can see tickets from their company
        query.company = userCompanyId;
      } else {
        // Regular users can only see their own tickets
        query.user = userId;
      }

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query.status = { $in: filters.status };
      }

      if (filters.priority && filters.priority.length > 0) {
        query.priority = { $in: filters.priority };
      }

      if (filters.category && filters.category.length > 0) {
        query.category = { $in: filters.category };
      }

      if (filters.assignedTo && filters.assignedTo.length > 0) {
        query.assignedTo = { $in: filters.assignedTo };
      }

      if (filters.company && filters.company.length > 0 && isSuperAdmin) {
        query.company = { $in: filters.company };
      }

      if (filters.dateRange) {
        query.createdAt = {};
        if (filters.dateRange.start) {
          query.createdAt.$gte = filters.dateRange.start;
        }
        if (filters.dateRange.end) {
          query.createdAt.$lte = filters.dateRange.end;
        }
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      // Apply search query
      if (filters.searchQuery) {
        query.$or = [
          { title: { $regex: filters.searchQuery, $options: 'i' } },
          { description: { $regex: filters.searchQuery, $options: 'i' } },
          { ticketNumber: { $regex: filters.searchQuery, $options: 'i' } },
        ];
      }

      // Calculate pagination
      const skip = (pagination.page! - 1) * pagination.limit!;

      // Build sort object
      const sort: any = {};
      sort[pagination.sortBy!] = pagination.sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const [tickets, totalCount] = await Promise.all([
        SupportTicketModel.find(query)
          .populate("user", "username firstName lastName email")
          .populate("company", "name")
          .populate("assignedTo", "username firstName lastName")
          .sort(sort)
          .skip(skip)
          .limit(pagination.limit!),
        SupportTicketModel.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / pagination.limit!);

      sendSuccess(res, "Tickets retrieved successfully", {
        tickets,
        pagination: {
          currentPage: pagination.page,
          totalPages,
          totalCount,
          hasNextPage: pagination.page! < totalPages,
          hasPreviousPage: pagination.page! > 1,
        },
        filters,
      });
    } catch (error) {
      console.error("Error fetching tickets with filters:", error);
      sendError(res, "Failed to fetch tickets", error);
    }
  }

  // Bulk operations on tickets
  static async bulkUpdateTickets(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const userCompanyId = (req.user as any)?.companyId;
      const userRole = (req.user as any)?.role;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!userId) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      if (!["admin", "staff"].includes(userRole) && !isSuperAdmin) {
        sendError(res, "Insufficient permissions", null, 403);
        return;
      }

      const { ticketIds, updates } = req.body;

      if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        sendError(res, "Ticket IDs are required", null, 400);
        return;
      }

      if (!updates || Object.keys(updates).length === 0) {
        sendError(res, "Updates are required", null, 400);
        return;
      }

      // Build access control query
      let accessQuery: any = { _id: { $in: ticketIds }, isDeleted: false };

      if (!isSuperAdmin) {
        accessQuery.company = userCompanyId;
      }

      // Validate that user has access to all tickets
      const accessibleTickets = await SupportTicketModel.find(accessQuery).select('_id');
      const accessibleTicketIds = accessibleTickets.map(t => t._id.toString());
      const inaccessibleTickets = ticketIds.filter((id: string) => !accessibleTicketIds.includes(id));

      if (inaccessibleTickets.length > 0) {
        sendError(res, `Access denied to tickets: ${inaccessibleTickets.join(', ')}`, null, 403);
        return;
      }

      // Prepare update object
      const updateObj: any = { ...updates, updatedAt: new Date() };

      // Execute bulk update
      const result = await SupportTicketModel.updateMany(
        { _id: { $in: ticketIds } },
        { $set: updateObj }
      );

      // Emit real-time updates for each ticket
      const updatedTickets = await SupportTicketModel.find({ _id: { $in: ticketIds } })
        .populate("user", "username firstName lastName email")
        .populate("company", "name")
        .populate("assignedTo", "username firstName lastName");

      for (const ticket of updatedTickets) {
        // Emit to company
        emitToCompany((ticket as any).company._id, Events.TicketUpdated, {
          ticketId: ticket._id,
          updates: updateObj,
          ticket: ticket.toObject(),
        });

        // Emit to super admin
        emitToSuperAdmin(Events.TicketUpdated, {
          ticketId: ticket._id,
          updates: updateObj,
          ticket: ticket.toObject(),
        });

        // Send notification to ticket creator if status changed
        if (updates.status) {
          await notifyUser((ticket as any).user._id, {
            type: "info",
            title: `Ticket ${(ticket as any).ticketNumber} Updated`,
            message: `Your ticket status has been changed to: ${updates.status}`,
            category: "ticket",
            actionUrl: `/support/tickets/${ticket._id}`,
          });
        }

        // Send notification to assigned user if assignment changed
        if (updates.assignedTo && updates.assignedTo !== (ticket as any).assignedTo?._id?.toString()) {
          await notifyUser(updates.assignedTo, {
            type: "info",
            title: `New Ticket Assigned`,
            message: `You have been assigned to ticket ${(ticket as any).ticketNumber}`,
            category: "ticket",
            actionUrl: `/support/tickets/${ticket._id}`,
          });
        }
      }

      sendSuccess(res, `Successfully updated ${result.modifiedCount} tickets`, {
        modifiedCount: result.modifiedCount,
        updates: updateObj,
      });
    } catch (error) {
      console.error("Error in bulk update tickets:", error);
      sendError(res, "Failed to update tickets", error);
    }
  }

  // Bulk delete tickets
  static async bulkDeleteTickets(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const userCompanyId = (req.user as any)?.companyId;
      const userRole = (req.user as any)?.role;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!userId) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      if (!["admin", "staff"].includes(userRole) && !isSuperAdmin) {
        sendError(res, "Insufficient permissions", null, 403);
        return;
      }

      const { ticketIds, permanent } = req.body;

      if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        sendError(res, "Ticket IDs are required", null, 400);
        return;
      }

      // Build access control query
      let accessQuery: any = { _id: { $in: ticketIds }, isDeleted: false };

      if (!isSuperAdmin) {
        accessQuery.company = userCompanyId;
      }

      // Validate access
      const accessibleTickets = await SupportTicketModel.find(accessQuery).select('_id company user');
      const accessibleTicketIds = accessibleTickets.map(t => t._id.toString());
      const inaccessibleTickets = ticketIds.filter((id: string) => !accessibleTicketIds.includes(id));

      if (inaccessibleTickets.length > 0) {
        sendError(res, `Access denied to tickets: ${inaccessibleTickets.join(', ')}`, null, 403);
        return;
      }

      let result;
      if (permanent) {
        // Permanent deletion - only super admin
        if (!isSuperAdmin) {
          sendError(res, "Only super admin can permanently delete tickets", null, 403);
          return;
        }
        
        // Delete associated messages first
        await SupportMessageModel.deleteMany({ ticket: { $in: ticketIds } });
        result = await SupportTicketModel.deleteMany({ _id: { $in: ticketIds } });
      } else {
        // Soft deletion
        result = await SupportTicketModel.updateMany(
          { _id: { $in: ticketIds } },
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } }
        );
      }

      // Emit real-time updates
      for (const ticket of accessibleTickets) {
        emitToCompany((ticket as any).company, Events.TicketUpdated, {
          ticketId: ticket._id,
          deleted: true,
          permanent,
        });

        emitToSuperAdmin(Events.TicketUpdated, {
          ticketId: ticket._id,
          deleted: true,
          permanent,
        });

        // Notify ticket creator
        await notifyUser((ticket as any).user, {
          type: "warning",
          title: "Ticket Deleted",
          message: `Your ticket has been ${permanent ? 'permanently ' : ''}deleted`,
          category: "ticket",
        });
      }

      sendSuccess(res, `Successfully ${permanent ? 'permanently ' : ''}deleted ${result.modifiedCount || result.deletedCount} tickets`);
    } catch (error) {
      console.error("Error in bulk delete tickets:", error);
      sendError(res, "Failed to delete tickets", error);
    }
  }

  // Get ticket analytics
  static async getTicketAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userCompanyId = (req.user as any)?.companyId;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!userCompanyId && !isSuperAdmin) {
        sendError(res, "User not authenticated", null, 401);
        return;
      }

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      let matchQuery: any = {
        createdAt: { $gte: start, $lte: end },
        isDeleted: false,
      };

      if (!isSuperAdmin) {
        matchQuery.company = userCompanyId;
      }

      const analytics = await SupportTicketModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            openTickets: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
            inProgressTickets: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
            closedTickets: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
            highPriorityTickets: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
            urgentTickets: { $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] } },
            avgResponseTime: { $avg: "$responseTime" },
            avgResolutionTime: { $avg: "$resolutionTime" },
          }
        }
      ]);

      const categoryStats = await SupportTicketModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const priorityStats = await SupportTicketModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const dailyStats = await SupportTicketModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            created: { $sum: 1 },
            closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const result = {
        summary: analytics[0] || {
          totalTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          closedTickets: 0,
          highPriorityTickets: 0,
          urgentTickets: 0,
          avgResponseTime: 0,
          avgResolutionTime: 0,
        },
        categoryBreakdown: categoryStats,
        priorityBreakdown: priorityStats,
        dailyTrends: dailyStats,
        period: { start, end },
      };

      sendSuccess(res, "Ticket analytics retrieved successfully", result);
    } catch (error) {
      console.error("Error fetching ticket analytics:", error);
      sendError(res, "Failed to fetch ticket analytics", error);
    }
  }
}
