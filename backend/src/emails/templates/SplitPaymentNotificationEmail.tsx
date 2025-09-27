import React from 'react';
import { Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from '../components/BaseLayout';
import { InfoCard, InfoGrid, InfoItem, StatusBadge } from '../components/EmailComponents';

interface SplitPaymentNotificationEmailProps {
  company: {
    name: string;
    logo?: string;
  };
  user: {
    name: string;
    email: string;
  };
  data: {
    type: "created" | "completed" | "overdue" | "reminder";
    splitPaymentId: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    currency: string;
    dueDate: string;
    status: string;
    paymentMethod?: string;
    nextDueDate?: string;
  };
  baseUrl: string;
}

export const SplitPaymentNotificationEmail: React.FC<SplitPaymentNotificationEmailProps> = ({
  company,
  user,
  data,
  baseUrl,
}) => {
  const getEmailContent = () => {
    switch (data.type) {
      case "created":
        return {
          title: "Split Payment Created! 💳",
          subtitle: "Payment Plan Created",
          message: `Hello ${user.name}, a split payment plan has been created for your transaction.`,
          status: "info" as const,
          statusText: "Active"
        };
      case "completed":
        return {
          title: "Split Payment Completed! ✅",
          subtitle: "Payment Plan Completed",
          message: `Hello ${user.name}, your split payment plan has been completed successfully.`,
          status: "success" as const,
          statusText: "Completed"
        };
      case "overdue":
        return {
          title: "Split Payment Overdue! ⚠️",
          subtitle: "Payment Overdue",
          message: `Hello ${user.name}, your split payment is overdue. Please make the payment as soon as possible.`,
          status: "warning" as const,
          statusText: "Overdue"
        };
      case "reminder":
        return {
          title: "Split Payment Reminder! 🔔",
          subtitle: "Payment Reminder",
          message: `Hello ${user.name}, this is a reminder about your upcoming split payment.`,
          status: "info" as const,
          statusText: "Due Soon"
        };
      default:
        return {
          title: "Split Payment Update",
          subtitle: "Payment Notification",
          message: `Hello ${user.name}, there's an update regarding your split payment.`,
          status: "info" as const,
          statusText: "Updated"
        };
    }
  };

  const content = getEmailContent();
  const progressPercentage = (data.paidAmount / data.totalAmount) * 100;

  return (
    <BaseLayout
      company={company}
      headerSubtitle={content.subtitle}
    >
      <Heading as="h2" style={{
        fontSize: '28px',
        fontWeight: 700,
        color: '#1a1a1a',
        margin: '0 0 28px 0',
        borderBottom: '1px solid #e1e2e6',
        paddingBottom: '28px',
      }}>
        {content.title}
      </Heading>
      
      <Text style={{
        fontSize: '16px',
        lineHeight: 1.7,
        color: '#9095a2',
        margin: '0 0 30px 0',
      }}>
        {content.message}
      </Text>
      
      <InfoCard title="Payment Details" variant={content.status}>
        <InfoGrid>
          <InfoItem label="Split Payment ID" value={data.splitPaymentId} />
          <InfoItem label="Total Amount" value={`${data.currency} ${data.totalAmount.toFixed(2)}`} />
          <InfoItem label="Paid Amount" value={`${data.currency} ${data.paidAmount.toFixed(2)}`} />
          <InfoItem label="Remaining Amount" value={`${data.currency} ${data.remainingAmount.toFixed(2)}`} />
          <InfoItem label="Due Date" value={data.dueDate} />
          {data.nextDueDate && (
            <InfoItem label="Next Due Date" value={data.nextDueDate} />
          )}
          <InfoItem 
            label="Status" 
            value={<StatusBadge status={content.status}>{content.statusText}</StatusBadge>} 
          />
        </InfoGrid>
      </InfoCard>

      <Section style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px 0',
        border: '1px solid #e9ecef',
      }}>
        <Text style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#495057',
          margin: '0 0 15px 0',
        }}>
          Payment Progress
        </Text>
        <div style={{
          backgroundColor: '#e9ecef',
          borderRadius: '10px',
          height: '20px',
          margin: '10px 0',
          overflow: 'hidden',
        }}>
          <div style={{
            backgroundColor: progressPercentage === 100 ? '#28a745' : '#007bff',
            height: '100%',
            width: `${progressPercentage}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <Text style={{
          fontSize: '14px',
          color: '#6c757d',
          margin: '0',
          textAlign: 'center',
        }}>
          {progressPercentage.toFixed(1)}% Complete
        </Text>
      </Section>

      {data.type === "overdue" && (
        <Section style={{
          backgroundColor: '#fff3cd',
          padding: '20px',
          borderRadius: '8px',
          margin: '20px 0',
          border: '1px solid #ffeaa7',
        }}>
          <Text style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#856404',
            margin: '0 0 10px 0',
          }}>
            ⚠️ Payment Overdue
          </Text>
          <Text style={{
            fontSize: '14px',
            color: '#856404',
            margin: '0',
          }}>
            Your payment is overdue. Please make the payment as soon as possible to avoid any service interruptions or additional fees.
          </Text>
        </Section>
      )}

      {data.type === "reminder" && (
        <Section style={{
          backgroundColor: '#d1ecf1',
          padding: '20px',
          borderRadius: '8px',
          margin: '20px 0',
          border: '1px solid #bee5eb',
        }}>
          <Text style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#0c5460',
            margin: '0 0 10px 0',
          }}>
            🔔 Payment Reminder
          </Text>
          <Text style={{
            fontSize: '14px',
            color: '#0c5460',
            margin: '0',
          }}>
            Your next payment is due soon. Please ensure you have sufficient funds available for the payment.
          </Text>
        </Section>
      )}
      
      <Text style={{
        fontSize: '16px',
        lineHeight: 1.7,
        color: '#9095a2',
        margin: '0 0 30px 0',
      }}>
        {data.type === "completed" 
          ? "Thank you for completing your payment plan. Your account is now up to date."
          : "If you have any questions about your split payment, please contact our support team."
        }
      </Text>
    </BaseLayout>
  );
};