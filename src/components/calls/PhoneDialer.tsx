"use client";

import { Phone, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhoneDialerProps {
  phoneNumber: string;
  contactName?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
  onCallStart?: () => void;
}

export function PhoneDialer({
  phoneNumber,
  contactName,
  variant = "default",
  size = "default",
  showIcon = true,
  className,
  onCallStart,
}: PhoneDialerProps) {
  // Normalize phone number for tel: link (remove spaces, parentheses, dashes)
  const normalizedNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, "");

  const handleClick = () => {
    if (onCallStart) {
      onCallStart();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      asChild
    >
      <a
        href={`tel:${normalizedNumber}`}
        onClick={handleClick}
        title={contactName ? `Call ${contactName}` : `Call ${phoneNumber}`}
      >
        {showIcon && <Phone className="h-4 w-4" />}
        {size !== "icon" && <span>{phoneNumber}</span>}
      </a>
    </Button>
  );
}

interface PhoneDialerIconProps {
  phoneNumber: string;
  contactName?: string;
  className?: string;
  onCallStart?: () => void;
}

export function PhoneDialerIcon({
  phoneNumber,
  contactName,
  className,
  onCallStart,
}: PhoneDialerIconProps) {
  const normalizedNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, "");

  return (
    <a
      href={`tel:${normalizedNumber}`}
      onClick={onCallStart}
      className={cn(
        "inline-flex items-center justify-center rounded-full p-2 hover:bg-green-100 text-green-600 transition-colors",
        className
      )}
      title={contactName ? `Call ${contactName}` : `Call ${phoneNumber}`}
    >
      <PhoneCall className="h-5 w-5" />
    </a>
  );
}

interface CallButtonProps {
  phoneNumber: string;
  contactName?: string;
  onCallStart?: () => void;
}

export function CallButton({ phoneNumber, contactName, onCallStart }: CallButtonProps) {
  const normalizedNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, "");

  return (
    <Button
      variant="default"
      className="bg-green-600 hover:bg-green-700 gap-2"
      asChild
    >
      <a
        href={`tel:${normalizedNumber}`}
        onClick={onCallStart}
        title={contactName ? `Call ${contactName}` : `Call ${phoneNumber}`}
      >
        <PhoneCall className="h-4 w-4" />
        <span>Call Now</span>
      </a>
    </Button>
  );
}
