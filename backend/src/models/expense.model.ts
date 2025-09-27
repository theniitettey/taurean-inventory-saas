import mongoose, { Schema, model, Model, Document } from "mongoose";

export interface Expense {
  _id?: string;
  company: string;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  paymentMethod: "cash" | "paystack" | "mobile_money" | "bank_transfer" | "cheque";
  paymentDetails?: {
    paystackReference?: string;
    chequeNumber?: string;
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      sortCode?: string;
    };
    mobileMoneyDetails?: {
      provider: string;
      phoneNumber: string;
      transactionId: string;
    };
  };
  vendor?: string;
  receiptUrl?: string;
  tags: string[];
  isRecurring: boolean;
  recurringFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  recurringEndDate?: Date;
  createdBy: string;
  approvedBy?: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  attachments: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpenseDocument extends Document {
  company: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  _id: mongoose.Types.ObjectId;
  category: string;
  description: string;
  amount: number;
  date: Date;
  attachments?: string[];
  notes?: string;
  status: "pending" | "approved" | "rejected";
  isRecurring: boolean;
  recurringFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  recurringEndDate?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<ExpenseDocument>(
  {
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    isRecurring: { type: Boolean, default: false },
    recurringFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
    },
    recurringEndDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    notes: { type: String, trim: true },
    attachments: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for better performance
ExpenseSchema.index({ company: 1, date: -1 });
ExpenseSchema.index({ category: 1, company: 1 });
ExpenseSchema.index({ status: 1, company: 1 });
ExpenseSchema.index({ createdBy: 1, date: -1 });
ExpenseSchema.index({ isRecurring: 1, company: 1 });

const ExpenseModel: Model<ExpenseDocument> = model<ExpenseDocument>(
  "Expense",
  ExpenseSchema
);

export { ExpenseDocument, ExpenseModel };