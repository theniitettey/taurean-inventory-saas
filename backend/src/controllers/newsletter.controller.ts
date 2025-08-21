import { Request, Response } from "express";
import { 
  NewsletterSubscriberModel, 
  NewsletterCampaignModel, 
  NewsletterTemplateModel,
  UnsubscriptionModel 
} from "../models";
import { sendError, sendSuccess } from "../utils";
import { scheduleEmail, scheduleRecurringEmail, ScheduledEmailJob } from "../queues";
import { emailService } from "../services/email.service";
import { notifyUser, notifyCompany } from "../services/notification.service";
import crypto from "crypto";

export class NewsletterController {
  // Subscribe to newsletter
  static async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, tags, preferences, source } = req.body;
      const companyId = req.query.company as string;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      if (!email) {
        sendError(res, "Email is required", null, 400);
        return;
      }

      // Check if already subscribed
      const existingSubscriber = await NewsletterSubscriberModel.findOne({ email });
      
      if (existingSubscriber) {
        if (existingSubscriber.isActive) {
          sendError(res, "Email is already subscribed", null, 409);
          return;
        } else {
          // Reactivate subscription
          existingSubscriber.isActive = true;
          existingSubscriber.subscribedAt = new Date();
          existingSubscriber.unsubscribedAt = undefined;
          if (name) existingSubscriber.name = name;
          if (tags) existingSubscriber.tags = tags;
          if (preferences) existingSubscriber.preferences = { ...existingSubscriber.preferences, ...preferences };
          
          await existingSubscriber.save();
          
          sendSuccess(res, "Successfully resubscribed to newsletter", {
            subscriber: existingSubscriber,
            token: existingSubscriber.unsubscribeToken
          });
          return;
        }
      }

      // Create new subscriber
      const subscriber = new NewsletterSubscriberModel({
        email,
        name,
        company: companyId,
        tags: tags || [],
        preferences: preferences || {},
        source: source || 'website',
        metadata: {
          ipAddress,
          userAgent,
          utmSource: req.query.utm_source as string,
          utmMedium: req.query.utm_medium as string,
          utmCampaign: req.query.utm_campaign as string,
          referrer: req.get('Referer'),
        },
      });

      await subscriber.save();

      // Send welcome email if enabled
      if (companyId) {
        try {
          await emailService.sendCustomEmail(
            email,
            "Welcome to our Newsletter!",
            `Thank you for subscribing to our newsletter. You can unsubscribe at any time using this link: ${process.env.FRONTEND_URL}/unsubscribe?token=${subscriber.unsubscribeToken}`,
            companyId
          );
        } catch (error) {
          console.error("Failed to send welcome email:", error);
        }
      }

      sendSuccess(res, "Successfully subscribed to newsletter", {
        subscriber: {
          email: subscriber.email,
          name: subscriber.name,
          subscribedAt: subscriber.subscribedAt,
        },
        token: subscriber.unsubscribeToken
      });
    } catch (error: any) {
      console.error("Error subscribing to newsletter:", error);
      sendError(res, "Failed to subscribe to newsletter", error.message);
    }
  }

  // Unsubscribe from newsletter
  static async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { token, email, reason, feedback } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      let subscriber;
      
      if (token) {
        subscriber = await NewsletterSubscriberModel.findOne({ unsubscribeToken: token });
      } else if (email) {
        subscriber = await NewsletterSubscriberModel.findOne({ email });
      }

      if (!subscriber) {
        sendError(res, "Subscriber not found", null, 404);
        return;
      }

      if (!subscriber.isActive) {
        sendError(res, "Email is already unsubscribed", null, 409);
        return;
      }

      // Update subscriber
      subscriber.isActive = false;
      subscriber.unsubscribedAt = new Date();
      await subscriber.save();

      // Create unsubscription record
      const unsubscription = new UnsubscriptionModel({
        email: subscriber.email,
        subscriber: subscriber._id,
        company: subscriber.company,
        reason: reason || 'user_request',
        userReason: reason,
        feedback,
        ipAddress,
        userAgent,
      });
      await unsubscription.save();

      sendSuccess(res, "Successfully unsubscribed from newsletter", {
        email: subscriber.email,
        unsubscribedAt: subscriber.unsubscribedAt,
        resubscribeToken: unsubscription.resubscribeToken
      });
    } catch (error: any) {
      console.error("Error unsubscribing from newsletter:", error);
      sendError(res, "Failed to unsubscribe from newsletter", error.message);
    }
  }

  // Resubscribe to newsletter
  static async resubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        sendError(res, "Resubscribe token is required", null, 400);
        return;
      }

      const unsubscription = await UnsubscriptionModel.findOne({ resubscribeToken: token });
      
      if (!unsubscription) {
        sendError(res, "Invalid resubscribe token", null, 404);
        return;
      }

      if (!unsubscription.canResubscribe) {
        sendError(res, "Resubscription not allowed for this email", null, 403);
        return;
      }

      const subscriber = await NewsletterSubscriberModel.findOne({ email: unsubscription.email });
      
      if (!subscriber) {
        sendError(res, "Subscriber not found", null, 404);
        return;
      }

      // Reactivate subscription
      subscriber.isActive = true;
      subscriber.subscribedAt = new Date();
      subscriber.unsubscribedAt = undefined;
      await subscriber.save();

      // Update unsubscription record
      unsubscription.resubscribedAt = new Date();
      await unsubscription.save();

      sendSuccess(res, "Successfully resubscribed to newsletter", {
        email: subscriber.email,
        resubscribedAt: new Date(),
      });
    } catch (error: any) {
      console.error("Error resubscribing to newsletter:", error);
      sendError(res, "Failed to resubscribe to newsletter", error.message);
    }
  }

  // Get subscriber preferences
  static async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      const subscriber = await NewsletterSubscriberModel.findOne({ unsubscribeToken: token });
      
      if (!subscriber) {
        sendError(res, "Subscriber not found", null, 404);
        return;
      }

      sendSuccess(res, "Subscriber preferences retrieved", {
        email: subscriber.email,
        name: subscriber.name,
        preferences: subscriber.preferences,
        tags: subscriber.tags,
        isActive: subscriber.isActive,
      });
    } catch (error: any) {
      console.error("Error getting subscriber preferences:", error);
      sendError(res, "Failed to get subscriber preferences", error.message);
    }
  }

  // Update subscriber preferences
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { name, preferences, tags } = req.body;

      const subscriber = await NewsletterSubscriberModel.findOne({ unsubscribeToken: token });
      
      if (!subscriber) {
        sendError(res, "Subscriber not found", null, 404);
        return;
      }

      if (name !== undefined) subscriber.name = name;
      if (preferences) subscriber.preferences = { ...subscriber.preferences, ...preferences };
      if (tags) subscriber.tags = tags;

      await subscriber.save();

      sendSuccess(res, "Subscriber preferences updated", {
        email: subscriber.email,
        name: subscriber.name,
        preferences: subscriber.preferences,
        tags: subscriber.tags,
      });
    } catch (error: any) {
      console.error("Error updating subscriber preferences:", error);
      sendError(res, "Failed to update subscriber preferences", error.message);
    }
  }

  // Get subscribers (admin only)
  static async getSubscribers(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req.user as any)?.companyId;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!companyId && !isSuperAdmin) {
        sendError(res, "Access denied", null, 403);
        return;
      }

      const { 
        page = 1, 
        limit = 20, 
        search, 
        tags, 
        isActive, 
        frequency,
        sortBy = 'subscribedAt',
        sortOrder = 'desc'
      } = req.query;

      const query: any = {};
      
      if (!isSuperAdmin) {
        query.company = companyId;
      }

      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      }

      if (tags) {
        const tagArray = (tags as string).split(',');
        query.tags = { $in: tagArray };
      }

      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      if (frequency) {
        query['preferences.frequency'] = frequency;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      const [subscribers, totalCount] = await Promise.all([
        NewsletterSubscriberModel.find(query)
          .sort(sort)
          .skip(skip)
          .limit(Number(limit))
          .populate('company', 'name'),
        NewsletterSubscriberModel.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / Number(limit));

      sendSuccess(res, "Subscribers retrieved successfully", {
        subscribers,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNextPage: Number(page) < totalPages,
          hasPreviousPage: Number(page) > 1,
        }
      });
    } catch (error: any) {
      console.error("Error getting subscribers:", error);
      sendError(res, "Failed to get subscribers", error.message);
    }
  }

  // Create newsletter campaign
  static async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const companyId = (req.user as any)?.companyId;

      if (!userId || !companyId) {
        sendError(res, "Authentication required", null, 401);
        return;
      }

      const {
        name,
        subject,
        content,
        segmentation,
        scheduledAt,
        abTest,
        settings
      } = req.body;

      if (!name || !subject || !content?.html) {
        sendError(res, "Name, subject, and HTML content are required", null, 400);
        return;
      }

      const campaign = new NewsletterCampaignModel({
        name,
        subject,
        content,
        company: companyId,
        createdBy: userId,
        segmentation: segmentation || {},
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        abTest: abTest || { enabled: false },
        settings: {
          trackOpens: true,
          trackClicks: true,
          allowUnsubscribe: true,
          fromName: "Taurean IT Logistics",
          ...settings
        }
      });

      await campaign.save();

      // If scheduled, add to email queue
      if (scheduledAt) {
        const emailJob: ScheduledEmailJob = {
          type: 'newsletter',
          to: [], // Will be populated when processing
          subject,
          content: content.html,
          templateData: { campaignId: campaign._id },
          companyId,
          userId,
          scheduledFor: new Date(scheduledAt),
          priority: 'normal',
        };

        await scheduleEmail(emailJob);
        campaign.status = 'scheduled';
        await campaign.save();
      }

      sendSuccess(res, "Newsletter campaign created successfully", campaign);
    } catch (error: any) {
      console.error("Error creating newsletter campaign:", error);
      sendError(res, "Failed to create newsletter campaign", error.message);
    }
  }

  // Get newsletter analytics
  static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req.user as any)?.companyId;
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!companyId && !isSuperAdmin) {
        sendError(res, "Access denied", null, 403);
        return;
      }

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      let matchQuery: any = {
        createdAt: { $gte: start, $lte: end }
      };

      if (!isSuperAdmin) {
        matchQuery.company = companyId;
      }

      // Subscriber analytics
      const subscriberStats = await NewsletterSubscriberModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSubscribers: { $sum: 1 },
            activeSubscribers: { $sum: { $cond: ["$isActive", 1, 0] } },
            inactiveSubscribers: { $sum: { $cond: ["$isActive", 0, 1] } },
          }
        }
      ]);

      // Campaign analytics
      const campaignStats = await NewsletterCampaignModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalCampaigns: { $sum: 1 },
            sentCampaigns: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
            scheduledCampaigns: { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
            draftCampaigns: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
            totalEmailsSent: { $sum: "$analytics.totalSent" },
            totalEmailsOpened: { $sum: "$analytics.totalOpened" },
            totalEmailsClicked: { $sum: "$analytics.totalClicked" },
            avgOpenRate: { $avg: "$analytics.openRate" },
            avgClickRate: { $avg: "$analytics.clickRate" },
          }
        }
      ]);

      // Unsubscription stats
      const unsubscriptionStats = await UnsubscriptionModel.aggregate([
        { $match: { ...matchQuery, unsubscribedAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: "$reason",
            count: { $sum: 1 }
          }
        }
      ]);

      // Growth trends
      const growthTrends = await NewsletterSubscriberModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$subscribedAt" } },
            subscriptions: { $sum: 1 },
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const result = {
        subscribers: subscriberStats[0] || {
          totalSubscribers: 0,
          activeSubscribers: 0,
          inactiveSubscribers: 0,
        },
        campaigns: campaignStats[0] || {
          totalCampaigns: 0,
          sentCampaigns: 0,
          scheduledCampaigns: 0,
          draftCampaigns: 0,
          totalEmailsSent: 0,
          totalEmailsOpened: 0,
          totalEmailsClicked: 0,
          avgOpenRate: 0,
          avgClickRate: 0,
        },
        unsubscriptions: unsubscriptionStats,
        growthTrends,
        period: { start, end }
      };

      sendSuccess(res, "Newsletter analytics retrieved successfully", result);
    } catch (error: any) {
      console.error("Error getting newsletter analytics:", error);
      sendError(res, "Failed to get newsletter analytics", error.message);
    }
  }

  // Import subscribers from CSV
  static async importSubscribers(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req.user as any)?.companyId;
      const userId = (req.user as any)?.id;

      if (!companyId) {
        sendError(res, "Company authentication required", null, 401);
        return;
      }

      const { subscribers, tags = [], skipExisting = true } = req.body;

      if (!subscribers || !Array.isArray(subscribers)) {
        sendError(res, "Subscribers array is required", null, 400);
        return;
      }

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as any[]
      };

      for (const subscriberData of subscribers) {
        try {
          const { email, name } = subscriberData;

          if (!email) {
            results.errors.push({ email: 'unknown', error: 'Email is required' });
            continue;
          }

          const existingSubscriber = await NewsletterSubscriberModel.findOne({ email });

          if (existingSubscriber) {
            if (skipExisting) {
              results.skipped++;
              continue;
            } else {
              // Update existing subscriber
              existingSubscriber.name = name || existingSubscriber.name;
              existingSubscriber.tags = [...new Set([...existingSubscriber.tags, ...tags])];
              existingSubscriber.isActive = true;
              await existingSubscriber.save();
              results.imported++;
            }
          } else {
            // Create new subscriber
            const newSubscriber = new NewsletterSubscriberModel({
              email,
              name,
              company: companyId,
              tags,
              source: 'import',
            });
            await newSubscriber.save();
            results.imported++;
          }
        } catch (error: any) {
          results.errors.push({ 
            email: subscriberData.email || 'unknown', 
            error: error.message 
          });
        }
      }

      sendSuccess(res, "Subscriber import completed", results);
    } catch (error: any) {
      console.error("Error importing subscribers:", error);
      sendError(res, "Failed to import subscribers", error.message);
    }
  }
}