import { Schema, model, Model, Document } from "mongoose";

export interface IUnsubscription {
  email: string;
  subscriber?: Schema.Types.ObjectId;
  campaign?: Schema.Types.ObjectId;
  company?: Schema.Types.ObjectId;
  reason?: 'user_request' | 'bounce' | 'complaint' | 'admin_action' | 'gdpr_request';
  userReason?: string;
  unsubscribedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  feedback?: string;
  canResubscribe: boolean;
  resubscribedAt?: Date;
  resubscribeToken?: string;
}

export interface UnsubscriptionDocument extends Document, IUnsubscription {}

const UnsubscriptionSchema = new Schema<UnsubscriptionDocument>(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    subscriber: { type: Schema.Types.ObjectId, ref: "NewsletterSubscriber" },
    campaign: { type: Schema.Types.ObjectId, ref: "NewsletterCampaign" },
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    reason: { 
      type: String, 
      enum: ['user_request', 'bounce', 'complaint', 'admin_action', 'gdpr_request'],
      default: 'user_request'
    },
    userReason: { type: String, trim: true },
    unsubscribedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    feedback: { type: String, trim: true },
    canResubscribe: { type: Boolean, default: true },
    resubscribedAt: { type: Date },
    resubscribeToken: { type: String },
  },
  { timestamps: true }
);

// Indexes
UnsubscriptionSchema.index({ email: 1 });
UnsubscriptionSchema.index({ subscriber: 1 });
UnsubscriptionSchema.index({ campaign: 1 });
UnsubscriptionSchema.index({ company: 1 });
UnsubscriptionSchema.index({ unsubscribedAt: 1 });
UnsubscriptionSchema.index({ resubscribeToken: 1 });

// Generate resubscribe token before saving
UnsubscriptionSchema.pre('save', function(next) {
  if (this.canResubscribe && !this.resubscribeToken) {
    this.resubscribeToken = require('crypto').randomBytes(32).toString('hex');
  }
  next();
});

export const UnsubscriptionModel: Model<UnsubscriptionDocument> = model<UnsubscriptionDocument>(
  "Unsubscription",
  UnsubscriptionSchema
);