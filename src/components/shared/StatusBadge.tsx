"use client";

import { ContactStatus, DealStage, Priority, TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: ContactStatus | DealStage | Priority | TaskStatus | string;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }
> = {
  // Contact Status
  LEAD: { label: "Lead", variant: "secondary" },
  QUALIFIED: { label: "Qualified", variant: "info" },
  CUSTOMER: { label: "Customer", variant: "success" },
  CHURNED: { label: "Churned", variant: "destructive" },
  PARTNER: { label: "Partner", variant: "default" },

  // Deal Stage
  QUALIFICATION: { label: "Qualification", variant: "secondary" },
  DISCOVERY: { label: "Discovery", variant: "info" },
  PROPOSAL: { label: "Proposal", variant: "warning" },
  NEGOTIATION: { label: "Negotiation", variant: "warning" },
  CLOSED_WON: { label: "Won", variant: "success" },
  CLOSED_LOST: { label: "Lost", variant: "destructive" },

  // Priority
  LOW: { label: "Low", variant: "secondary" },
  MEDIUM: { label: "Medium", variant: "info" },
  HIGH: { label: "High", variant: "warning" },
  URGENT: { label: "Urgent", variant: "destructive" },

  // Task Status
  TODO: { label: "To Do", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "secondary" };

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
