import { Schema, model, Model, Document } from "mongoose";

export interface INewsletterTemplate {
  name: string;
  description?: string;
  company?: Schema.Types.ObjectId;
  isGlobal: boolean;
  category: string;
  thumbnail?: string;
  content: {
    html: string;
    text?: string;
    css?: string;
  };
  variables: Array<{
    name: string;
    type: 'text' | 'image' | 'url' | 'date' | 'number';
    required: boolean;
    defaultValue?: string;
    description?: string;
  }>;
  createdBy: Schema.Types.ObjectId;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: Date;
}

export interface NewsletterTemplateDocument extends Document, INewsletterTemplate {}

const NewsletterTemplateSchema = new Schema<NewsletterTemplateDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    isGlobal: { type: Boolean, default: false },
    category: { type: String, required: true, trim: true },
    thumbnail: { type: String },
    content: {
      html: { type: String, required: true },
      text: { type: String },
      css: { type: String },
    },
    variables: [{
      name: { type: String, required: true, trim: true },
      type: { 
        type: String, 
        enum: ['text', 'image', 'url', 'date', 'number'], 
        required: true 
      },
      required: { type: Boolean, default: false },
      defaultValue: { type: String },
      description: { type: String, trim: true },
    }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
NewsletterTemplateSchema.index({ company: 1 });
NewsletterTemplateSchema.index({ isGlobal: 1 });
NewsletterTemplateSchema.index({ category: 1 });
NewsletterTemplateSchema.index({ isActive: 1 });
NewsletterTemplateSchema.index({ createdBy: 1 });

export const NewsletterTemplateModel: Model<NewsletterTemplateDocument> = model<NewsletterTemplateDocument>(
  "NewsletterTemplate",
  NewsletterTemplateSchema
);