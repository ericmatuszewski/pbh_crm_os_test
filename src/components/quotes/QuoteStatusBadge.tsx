"use client";

import { QuoteStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
}

const statusConfig: Record<
  QuoteStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "default" },
  ACCEPTED: { label: "Accepted", variant: "success" },
  DECLINED: { label: "Declined", variant: "destructive" },
  EXPIRED: { label: "Expired", variant: "outline" },
};

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
