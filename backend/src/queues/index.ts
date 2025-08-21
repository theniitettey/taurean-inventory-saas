import { Queue, Worker, JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { CONFIG } from "../config";
import { DeletionRequestModel } from "../models/deletionRequest.model";
import { emailService } from "../services/email.service";
import { emitEmailStatus } from "../realtime/socket";
import mongoose from "mongoose";

const connection = new IORedis(CONFIG.REDIS_URL as string, {
  maxRetriesPerRequest: null,
});

// connection.config("SET", "maxmemory-policy", "noeviction");

export const deletionQueue = new Queue("deletion-queue", { connection });
export const emailQueue = new Queue("email-queue", { connection });

// Email scheduling functionality
export interface ScheduledEmailJob {
  type: 'custom' | 'welcome' | 'invoice' | 'receipt' | 'booking-confirmation' | 'booking-reminder' | 'newsletter';
  to: string | string[];
  subject?: string;
  content?: string;
  templateData?: any;
  companyId?: string;
  userId?: string;
  scheduledFor: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  retryAttempts?: number;
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    endDate?: Date;
    maxOccurrences?: number;
  };
}

export async function scheduleEmail(emailJob: ScheduledEmailJob) {
  const delay = Math.max(0, emailJob.scheduledFor.getTime() - Date.now());
  const priority = getPriorityValue(emailJob.priority || 'normal');
  
  const opts: JobsOptions = {
    delay,
    priority,
    attempts: emailJob.retryAttempts || 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  };

  const job = await emailQueue.add('send-scheduled-email', emailJob, opts);
  
  // Emit scheduling confirmation
  if (emailJob.userId && emailJob.companyId) {
    emitEmailStatus(emailJob.userId, emailJob.companyId, {
      emailId: job.id?.toString() || 'unknown',
      status: 'scheduled',
      message: `Email scheduled for ${emailJob.scheduledFor.toISOString()}`,
      timestamp: new Date()
    });
  }

  return job;
}

export async function scheduleRecurringEmail(emailJob: ScheduledEmailJob) {
  if (!emailJob.recurring) {
    throw new Error('Recurring configuration is required for recurring emails');
  }

  const jobs = [];
  let currentDate = new Date(emailJob.scheduledFor);
  const endDate = emailJob.recurring.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default
  const maxOccurrences = emailJob.recurring.maxOccurrences || 100;
  let occurrenceCount = 0;

  while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
    const jobData = {
      ...emailJob,
      scheduledFor: new Date(currentDate),
      recurring: undefined // Remove recurring from individual jobs
    };

    const job = await scheduleEmail(jobData);
    jobs.push(job);
    
    occurrenceCount++;
    
    // Calculate next occurrence
    switch (emailJob.recurring.pattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + (emailJob.recurring.interval || 1));
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * (emailJob.recurring.interval || 1)));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + (emailJob.recurring.interval || 1));
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + (emailJob.recurring.interval || 1));
        break;
    }
  }

  return jobs;
}

export async function cancelScheduledEmail(jobId: string) {
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

export async function getScheduledEmails(companyId?: string, userId?: string) {
  const jobs = await emailQueue.getJobs(['delayed', 'waiting']);
  
  return jobs
    .filter(job => {
      if (companyId && job.data.companyId !== companyId) return false;
      if (userId && job.data.userId !== userId) return false;
      return true;
    })
    .map(job => ({
      id: job.id,
      type: job.data.type,
      to: job.data.to,
      subject: job.data.subject,
      scheduledFor: job.data.scheduledFor,
      status: job.opts.delay && job.opts.delay > 0 ? 'scheduled' : 'queued',
      priority: job.data.priority,
      createdAt: new Date(job.timestamp),
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts
    }));
}

export async function enqueueDeletion(requestId: string, executeAt: Date) {
  const delay = Math.max(0, executeAt.getTime() - Date.now());
  const opts: JobsOptions = {
    delay,
    removeOnComplete: true,
    removeOnFail: false,
  };
  await deletionQueue.add("execute-delete", { requestId }, opts);
}

function getPriorityValue(priority: string): number {
  switch (priority) {
    case 'urgent': return 1;
    case 'high': return 2;
    case 'normal': return 3;
    case 'low': return 4;
    default: return 3;
  }
}

export function startEmailWorker() {
  const worker = new Worker(
    "email-queue",
    async (job) => {
      const emailJob = job.data as ScheduledEmailJob;
      
      try {
        let success = false;
        
        switch (emailJob.type) {
          case 'custom':
            success = await emailService.sendCustomEmail(
              emailJob.to as string,
              emailJob.subject!,
              emailJob.content!,
              emailJob.companyId
            );
            break;
            
          case 'welcome':
            if (emailJob.templateData?.userId) {
              success = await emailService.sendWelcomeEmail(emailJob.templateData.userId);
            }
            break;
            
          case 'invoice':
            if (emailJob.templateData?.invoiceId) {
              success = await emailService.sendInvoiceEmail(emailJob.templateData.invoiceId, true);
            }
            break;
            
          case 'receipt':
            if (emailJob.templateData?.receiptId) {
              success = await emailService.sendReceiptEmail(emailJob.templateData.receiptId, true);
            }
            break;
            
          case 'booking-confirmation':
            if (emailJob.templateData?.bookingId) {
              success = await emailService.sendBookingConfirmation(emailJob.templateData.bookingId);
            }
            break;
            
          case 'booking-reminder':
            if (emailJob.templateData?.bookingId) {
              success = await emailService.sendBookingReminder(emailJob.templateData.bookingId);
            }
            break;
            
          case 'newsletter':
            // Newsletter functionality would be implemented here
            success = await sendNewsletterEmail(emailJob);
            break;
            
          default:
            throw new Error(`Unknown email type: ${emailJob.type}`);
        }
        
        if (success) {
          // Emit success status
          if (emailJob.userId && emailJob.companyId) {
            emitEmailStatus(emailJob.userId, emailJob.companyId, {
              emailId: job.id?.toString() || 'unknown',
              status: 'sent',
              message: 'Email sent successfully',
              timestamp: new Date()
            });
          }
          console.log(`Email sent successfully: ${emailJob.type} to ${emailJob.to}`);
        } else {
          throw new Error('Email sending failed');
        }
        
      } catch (error) {
        // Emit failure status
        if (emailJob.userId && emailJob.companyId) {
          emitEmailStatus(emailJob.userId, emailJob.companyId, {
            emailId: job.id?.toString() || 'unknown',
            status: 'failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          });
        }
        
        console.error(`Email job failed: ${emailJob.type}`, error);
        throw error;
      }
    },
    { 
      connection,
      concurrency: 5 // Process up to 5 emails concurrently
    }
  );

  worker.on("completed", (job) => {
    console.log(`Email job completed: ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Email job failed: ${job?.id}`, err.message);
  });

  return worker;
}

async function sendNewsletterEmail(emailJob: ScheduledEmailJob): Promise<boolean> {
  // This would integrate with a newsletter service or template system
  // For now, we'll use the custom email functionality
  return await emailService.sendCustomEmail(
    emailJob.to as string,
    emailJob.subject || 'Newsletter',
    emailJob.content || 'Newsletter content',
    emailJob.companyId
  );
}

export function startDeletionWorker() {
  const worker = new Worker(
    "deletion-queue",
    async (job) => {
      const { requestId } = job.data as { requestId: string };
      const req = await DeletionRequestModel.findById(requestId);
      if (!req || (req as any).status !== "queued") return;
      if ((req as any).executeAfter > new Date()) return; // safety guard
      // Perform scoped deletions
      if ((req as any).scope === "company" && (req as any).company) {
        const companyId = (req as any).company as mongoose.Types.ObjectId;
        // delete company-related data: users, facilities, inventory, bookings, transactions, etc.
        // Soft delete or hard delete as per requirement; here hard delete
        await Promise.all([
          mongoose.connection
            .collection("users")
            .deleteMany({ company: companyId }),
          mongoose.connection
            .collection("facilities")
            .deleteMany({ createdByCompany: companyId }),
          mongoose.connection
            .collection("inventoryitems")
            .deleteMany({ company: companyId }),
          mongoose.connection
            .collection("bookings")
            .deleteMany({ company: companyId }),
          mongoose.connection
            .collection("transactions")
            .deleteMany({ company: companyId }),
          mongoose.connection
            .collection("invoices")
            .deleteMany({ company: companyId }),
          mongoose.connection
            .collection("receipts")
            .deleteMany({ company: companyId }),
        ]);
        await mongoose.connection
          .collection("companies")
          .deleteOne({ _id: companyId });
      } else if ((req as any).scope === "user" && (req as any).user) {
        const userId = (req as any).user as mongoose.Types.ObjectId;
        await Promise.all([
          mongoose.connection
            .collection("bookings")
            .deleteMany({ user: userId }),
          mongoose.connection
            .collection("transactions")
            .deleteMany({ user: userId }),
        ]);
        await mongoose.connection
          .collection("users")
          .deleteOne({ _id: userId });
      }
      (req as any).status = "executed";
      (req as any).executedAt = new Date();
      await req.save();
    },
    { connection }
  );
  worker.on("failed", (job, err) => {
    console.error("Deletion job failed", job?.id, err);
  });
}
