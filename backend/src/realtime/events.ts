export const Events = {
  // Booking events
  BookingCreated: "booking:created",
  BookingUpdated: "booking:updated",
  BookingCancelled: "booking:cancelled",
  BookingConfirmed: "booking:confirmed",
  
  // Inventory events
  InventoryCreated: "inventory:created",
  InventoryUpdated: "inventory:updated",
  InventoryDeleted: "inventory:deleted",
  InventoryLowStock: "inventory:low-stock",
  
  // Transaction events
  TransactionCreated: "transaction:created",
  TransactionUpdated: "transaction:updated",
  TransactionFailed: "transaction:failed",
  
  // Invoice events
  InvoiceCreated: "invoice:created",
  InvoicePaid: "invoice:paid",
  InvoiceOverdue: "invoice:overdue",
  
  // Email events
  EmailSent: "email:sent",
  EmailFailed: "email:failed",
  EmailScheduled: "email:scheduled",
  EmailDelivered: "email:delivered",
  
  // Notification events
  NotificationUser: "notification:user",
  NotificationCompany: "notification:company",
  NotificationRead: "notification:read",
  
  // User activity events
  UserOnline: "user:online",
  UserOffline: "user:offline",
  UserActivity: "user:activity",
  
  // System events
  SystemAlert: "system:alert",
  SystemMaintenance: "system:maintenance",
  SystemHealth: "system:health",
  
  // Dashboard events
  DashboardUpdate: "dashboard:update",
  StatsUpdate: "stats:update",
  
  // Support ticket events
  TicketCreated: "ticket:created",
  TicketUpdated: "ticket:updated",
  TicketAssigned: "ticket:assigned",
  TicketClosed: "ticket:closed",
  TicketMessageAdded: "ticket:message-added",
  
  // Company events
  CompanyCreated: "company:created",
  CompanyUpdated: "company:updated",
  CompanySubscriptionChanged: "company:subscription-changed",
  
  // Facility events
  FacilityCreated: "facility:created",
  FacilityUpdated: "facility:updated",
  FacilityDeleted: "facility:deleted",
  FacilityStatusChanged: "facility:status-changed",
} as const;

export type EventName = typeof Events[keyof typeof Events];