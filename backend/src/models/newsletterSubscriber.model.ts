import { Schema, model, Model, Document } from "mongoose";

export interface INewsletterSubscriber {
  email: string;
  name?: string;
  company?: Schema.Types.ObjectId;
  isActive: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  source: 'website' | 'import' | 'manual' | 'api';
  tags: string[];
  preferences: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'never';
    categories: string[];
    format: 'html' | 'text';
  };
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  emailDeliveryStats: {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    lastOpenedAt?: Date;
    lastClickedAt?: Date;
  };
  unsubscribeToken: string;
}

export interface NewsletterSubscriberDocument extends Document, INewsletterSubscriber {}

const NewsletterSubscriberSchema = new Schema<NewsletterSubscriberDocument>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, trim: true },
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    isActive: { type: Boolean, default: true },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date },
    source: { 
      type: String, 
      enum: ['website', 'import', 'manual', 'api'], 
      default: 'website' 
    },
    tags: [{ type: String, trim: true }],
    preferences: {
      frequency: { 
        type: String, 
        enum: ['daily', 'weekly', 'monthly', 'never'], 
        default: 'weekly' 
      },
      categories: [{ type: String, trim: true }],
      format: { 
        type: String, 
        enum: ['html', 'text'], 
        default: 'html' 
      },
    },
    metadata: {
      ipAddress: { type: String },
      userAgent: { type: String },
      referrer: { type: String },
      utmSource: { type: String },
      utmMedium: { type: String },
      utmCampaign: { type: String },
    },
    emailDeliveryStats: {
      totalSent: { type: Number, default: 0 },
      totalDelivered: { type: Number, default: 0 },
      totalOpened: { type: Number, default: 0 },
      totalClicked: { type: Number, default: 0 },
      totalBounced: { type: Number, default: 0 },
      lastOpenedAt: { type: Date },
      lastClickedAt: { type: Date },
    },
    unsubscribeToken: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

// Indexes for performance
NewsletterSubscriberSchema.index({ email: 1 });
NewsletterSubscriberSchema.index({ company: 1 });
NewsletterSubscriberSchema.index({ isActive: 1 });
NewsletterSubscriberSchema.index({ tags: 1 });
NewsletterSubscriberSchema.index({ unsubscribeToken: 1 });
NewsletterSubscriberSchema.index({ 'preferences.frequency': 1 });

// Generate unsubscribe token before saving
NewsletterSubscriberSchema.pre('save', function(next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = require('crypto').randomBytes(32).toString('hex');
  }
  next();
});

export const NewsletterSubscriberModel: Model<NewsletterSubscriberDocument> = model<NewsletterSubscriberDocument>(
  "NewsletterSubscriber",
  NewsletterSubscriberSchema
);