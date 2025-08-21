import { Schema, model, Model, Document } from "mongoose";

export interface INewsletterCampaign {
  name: string;
  subject: string;
  content: {
    html: string;
    text?: string;
  };
  company: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  segmentation: {
    tags?: string[];
    categories?: string[];
    frequency?: string[];
    excludeTags?: string[];
    customFilters?: any;
  };
  abTest?: {
    enabled: boolean;
    subjectVariants: string[];
    contentVariants: string[];
    testPercentage: number;
    winnerMetric: 'opens' | 'clicks' | 'conversions';
  };
  analytics: {
    totalRecipients: number;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribed: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    lastUpdated: Date;
  };
  settings: {
    trackOpens: boolean;
    trackClicks: boolean;
    allowUnsubscribe: boolean;
    replyToEmail?: string;
    fromName?: string;
  };
}

export interface NewsletterCampaignDocument extends Document, INewsletterCampaign {}

const NewsletterCampaignSchema = new Schema<NewsletterCampaignDocument>(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    content: {
      html: { type: String, required: true },
      text: { type: String },
    },
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { 
      type: String, 
      enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'], 
      default: 'draft' 
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    segmentation: {
      tags: [{ type: String, trim: true }],
      categories: [{ type: String, trim: true }],
      frequency: [{ type: String, enum: ['daily', 'weekly', 'monthly'] }],
      excludeTags: [{ type: String, trim: true }],
      customFilters: { type: Schema.Types.Mixed },
    },
    abTest: {
      enabled: { type: Boolean, default: false },
      subjectVariants: [{ type: String }],
      contentVariants: [{ type: String }],
      testPercentage: { type: Number, min: 0, max: 100, default: 20 },
      winnerMetric: { 
        type: String, 
        enum: ['opens', 'clicks', 'conversions'], 
        default: 'opens' 
      },
    },
    analytics: {
      totalRecipients: { type: Number, default: 0 },
      totalSent: { type: Number, default: 0 },
      totalDelivered: { type: Number, default: 0 },
      totalOpened: { type: Number, default: 0 },
      totalClicked: { type: Number, default: 0 },
      totalBounced: { type: Number, default: 0 },
      totalUnsubscribed: { type: Number, default: 0 },
      openRate: { type: Number, default: 0 },
      clickRate: { type: Number, default: 0 },
      bounceRate: { type: Number, default: 0 },
      unsubscribeRate: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    settings: {
      trackOpens: { type: Boolean, default: true },
      trackClicks: { type: Boolean, default: true },
      allowUnsubscribe: { type: Boolean, default: true },
      replyToEmail: { type: String },
      fromName: { type: String, default: "Taurean IT Logistics" },
    },
  },
  { timestamps: true }
);

// Indexes
NewsletterCampaignSchema.index({ company: 1 });
NewsletterCampaignSchema.index({ status: 1 });
NewsletterCampaignSchema.index({ scheduledAt: 1 });
NewsletterCampaignSchema.index({ createdBy: 1 });

// Update analytics rates when analytics data changes
NewsletterCampaignSchema.pre('save', function(next) {
  if (this.isModified('analytics')) {
    const analytics = this.analytics;
    if (analytics.totalSent > 0) {
      analytics.openRate = (analytics.totalOpened / analytics.totalSent) * 100;
      analytics.clickRate = (analytics.totalClicked / analytics.totalSent) * 100;
      analytics.bounceRate = (analytics.totalBounced / analytics.totalSent) * 100;
      analytics.unsubscribeRate = (analytics.totalUnsubscribed / analytics.totalSent) * 100;
    }
    analytics.lastUpdated = new Date();
  }
  next();
});

export const NewsletterCampaignModel: Model<NewsletterCampaignDocument> = model<NewsletterCampaignDocument>(
  "NewsletterCampaign",
  NewsletterCampaignSchema
);