import React from 'react';
import { Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from '../components/BaseLayout';
import { InfoCard, InfoGrid, InfoItem, StatusBadge } from '../components/EmailComponents';

interface SubscriptionNotificationEmailProps {
  company: {
    name: string;
    logo?: string;
  };
  user: {
    name: string;
    email: string;
  };
  data: {
    type: "activated" | "expired" | "expiring" | "trial_ending";
    plan: string;
    expiresAt: string;
    isTrial?: boolean;
    daysRemaining?: number;
  };
  baseUrl: string;
}

export const SubscriptionNotificationEmail: React.FC<SubscriptionNotificationEmailProps> = ({
  company,
  user,
  data,
  baseUrl,
}) => {
  const getEmailContent = () => {
    switch (data.type) {
      case "activated":
        return {
          title: "Subscription Activated! 🎉",
          subtitle: "Welcome to Premium",
          message: `Hello ${user.name}, your ${data.plan} subscription has been activated successfully.`,
          status: "success" as const,
          statusText: "Active"
        };
      case "expired":
        return {
          title: "Subscription Expired - Action Required! ⚠️",
          subtitle: "Subscription Expired",
          message: `Hello ${user.name}, your ${data.plan} subscription has expired. Please renew to continue using the service.`,
          status: "warning" as const,
          statusText: "Expired"
        };
      case "expiring":
        return {
          title: "Subscription Expiring Soon! 🔔",
          subtitle: "Renewal Reminder",
          message: `Hello ${user.name}, your ${data.plan} subscription will expire soon. Please renew to avoid service interruption.`,
          status: "info" as const,
          statusText: "Expiring"
        };
      case "trial_ending":
        return {
          title: "Free Trial Ending Soon! ⏰",
          subtitle: "Trial Ending",
          message: `Hello ${user.name}, your free trial will end soon. Subscribe now to continue using all features.`,
          status: "info" as const,
          statusText: "Trial Ending"
        };
      default:
        return {
          title: "Subscription Update",
          subtitle: "Subscription Notification",
          message: `Hello ${user.name}, there's an update regarding your subscription.`,
          status: "info" as const,
          statusText: "Updated"
        };
    }
  };

  const content = getEmailContent();

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
      
      <InfoCard title="Subscription Details" variant={content.status}>
        <InfoGrid>
          <InfoItem label="Plan" value={data.plan} />
          <InfoItem label="Expires At" value={data.expiresAt} />
          {data.daysRemaining && (
            <InfoItem label="Days Remaining" value={data.daysRemaining.toString()} />
          )}
          <InfoItem 
            label="Status" 
            value={<StatusBadge status={content.status}>{content.statusText}</StatusBadge>} 
          />
          {data.isTrial && (
            <InfoItem label="Type" value="Free Trial" />
          )}
        </InfoGrid>
      </InfoCard>

      {data.type === "activated" && (
        <Text style={{
          fontSize: '16px',
          lineHeight: 1.7,
          color: '#9095a2',
          margin: '0 0 30px 0',
        }}>
          You now have access to all premium features. Enjoy your enhanced experience with our platform!
        </Text>
      )}

      {(data.type === "expired" || data.type === "expiring" || data.type === "trial_ending") && (
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
            margin: '0 0 10px 0',
          }}>
            {data.type === "expired" 
              ? "To continue using our services:"
              : data.type === "trial_ending"
              ? "To continue after your trial:"
              : "To avoid service interruption:"
            }
          </Text>
          <Text style={{
            fontSize: '14px',
            color: '#6c757d',
            margin: '0 0 15px 0',
          }}>
            1. Log in to your account<br />
            2. Go to the subscription section<br />
            3. Choose your preferred plan<br />
            4. Complete the payment process
          </Text>
          <Text style={{
            fontSize: '14px',
            color: '#6c757d',
            margin: '0',
          }}>
            Need help? Contact our support team for assistance.
          </Text>
        </Section>
      )}
      
      <Text style={{
        fontSize: '16px',
        lineHeight: 1.7,
        color: '#9095a2',
        margin: '0 0 30px 0',
      }}>
        If you have any questions about your subscription, please contact our support team.
      </Text>
    </BaseLayout>
  );
};