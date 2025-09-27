import mongoose, { Schema, model, Model, Document } from "mongoose";

export interface Discount {
  _id?: string;
  company: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed";
  value: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  applicableTo: "all" | "facility" | "inventory_item" | "booking";
  applicableItems?: string[]; // IDs of facilities, inventory items, or bookings
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdBy: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DiscountDocument extends Document {
  company: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  _id: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  type: "percentage" | "fixed";
  value: number;
  appliesTo: "all" | "facility" | "inventory_item";
  targetId?: mongoose.Types.ObjectId;
  minimumAmount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountSchema = new Schema<DiscountDocument>(
  {
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    minimumAmount: { type: Number, min: 0 },
    appliesTo: {
      type: String,
      enum: ["all", "facility", "inventory_item"],
      default: "all",
    },
    targetId: { type: Schema.Types.ObjectId, refPath: "appliesTo" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for better performance
DiscountSchema.index({ company: 1, isActive: 1, startDate: 1, endDate: 1 });
DiscountSchema.index({ applicableTo: 1, company: 1 });
DiscountSchema.index({ createdBy: 1, createdAt: -1 });

const DiscountModel: Model<DiscountDocument> = model<DiscountDocument>(
  "Discount",
  DiscountSchema
);

export { DiscountDocument, DiscountModel };