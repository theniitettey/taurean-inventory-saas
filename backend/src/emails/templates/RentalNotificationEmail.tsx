import React from 'react';
import { Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from '../components/BaseLayout';
import { InfoCard, InfoGrid, InfoItem, StatusBadge } from '../components/EmailComponents';

interface RentalNotificationEmailProps {
  company: {
    name: string;
    logo?: string;
  };
  user: {
    name: string;
    email: string;
  };
  data: {
    type: "created" | "returned" | "overdue" | "due_soon";
    itemName: string;
    rentalId: string;
    startDate: string;
    endDate: string;
    amount: number;
    currency: string;
    status?: string;
    returnDate?: string;
    returnCondition?: string;
    lateFee?: number;
    damageFee?: number;
  };
  baseUrl: string;
}

export const RentalNotificationEmail: React.FC<RentalNotificationEmailProps> = ({
  company,
  user,
  data,
  baseUrl,
}) => {
  const getEmailContent = () => {
    switch (data.type) {
      case "created":
        return {
          title: "Item Rented Successfully! 📦",
          subtitle: "Rental Confirmation",
          message: `Hello ${user.name}, your rental for ${data.itemName} has been confirmed.`,
          status: "success" as const,
          statusText: "Active"
        };
      case "returned":
        return {
          title: "Item Returned Successfully! ✅",
          subtitle: "Return Confirmation",
          message: `Hello ${user.name}, your rental for ${data.itemName} has been returned successfully.`,
          status: "success" as const,
          statusText: "Returned"
        };
      case "overdue":
        return {
          title: "Rental Overdue - Action Required! ⚠️",
          subtitle: "Overdue Notice",
          message: `Hello ${user.name}, your rental for ${data.itemName} is overdue. Please return it as soon as possible.`,
          status: "warning" as const,
          statusText: "Overdue"
        };
      case "due_soon":
        return {
          title: "Rental Due Soon - Reminder! 🔔",
          subtitle: "Return Reminder",
          message: `Hello ${user.name}, your rental for ${data.itemName} is due soon. Please prepare for return.`,
          status: "info" as const,
          statusText: "Due Soon"
        };
      default:
        return {
          title: "Rental Update",
          subtitle: "Rental Notification",
          message: `Hello ${user.name}, there's an update regarding your rental for ${data.itemName}.`,
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
      
      <InfoCard title="Rental Details" variant={content.status}>
        <InfoGrid>
          <InfoItem label="Item" value={data.itemName} />
          <InfoItem label="Rental ID" value={data.rentalId} />
          <InfoItem label="Start Date" value={data.startDate} />
          <InfoItem label="End Date" value={data.endDate} />
          <InfoItem label="Amount" value={`${data.currency} ${data.amount.toFixed(2)}`} />
          <InfoItem 
            label="Status" 
            value={<StatusBadge status={content.status}>{content.statusText}</StatusBadge>} 
          />
        </InfoGrid>
      </InfoCard>

      {data.returnDate && (
        <InfoCard title="Return Information" variant="info">
          <InfoGrid>
            <InfoItem label="Return Date" value={data.returnDate} />
            {data.returnCondition && (
              <InfoItem label="Condition" value={data.returnCondition} />
            )}
            {data.lateFee && data.lateFee > 0 && (
              <InfoItem label="Late Fee" value={`${data.currency} ${data.lateFee.toFixed(2)}`} />
            )}
            {data.damageFee && data.damageFee > 0 && (
              <InfoItem label="Damage Fee" value={`${data.currency} ${data.damageFee.toFixed(2)}`} />
            )}
          </InfoGrid>
        </InfoCard>
      )}
      
      <Text style={{
        fontSize: '16px',
        lineHeight: 1.7,
        color: '#9095a2',
        margin: '0 0 30px 0',
      }}>
        {data.type === "overdue" 
          ? "Please return the item as soon as possible to avoid additional fees. Contact us if you need assistance."
          : data.type === "due_soon"
          ? "Please prepare the item for return on or before the due date."
          : "If you have any questions about this rental, please contact our support team."
        }
      </Text>
    </BaseLayout>
  );
};