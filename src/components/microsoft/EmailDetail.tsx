"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  Paperclip,
  Download,
  ExternalLink,
  User,
  Building,
  Target,
  Link as LinkIcon,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Email } from "./types";

interface EmailDetailProps {
  email: Email;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onClose?: () => void;
  onLink?: (linkType: "contact" | "company" | "deal") => void;
  className?: string;
}

export function EmailDetail({
  email,
  onReply,
  onReplyAll,
  onForward,
  onClose,
  onLink,
  className,
}: EmailDetailProps) {
  const [fullEmail, setFullEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (email.bodyHtml === null) {
      fetchFullEmail();
    } else {
      setFullEmail(email);
    }
  }, [email.id]);

  const fetchFullEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/microsoft/emails/${email.id}`);
      const data = await res.json();
      if (data.success) {
        setFullEmail(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch email:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const res = await fetch(`/api/microsoft/emails/${email.id}/attachments/${attachmentId}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download attachment:", error);
    }
  };

  const displayEmail = fullEmail || email;
  const date = displayEmail.direction === "INBOUND" ? displayEmail.receivedAt : displayEmail.sentAt;
  const isLinked = displayEmail.contactId || displayEmail.companyId || displayEmail.dealId;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold flex-1">
            {displayEmail.subject || "(No subject)"}
          </h2>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          {onReply && (
            <Button variant="outline" size="sm" onClick={onReply}>
              <Reply className="h-4 w-4 mr-1" />
              Reply
            </Button>
          )}
          {onReplyAll && displayEmail.toEmails.length > 1 && (
            <Button variant="outline" size="sm" onClick={onReplyAll}>
              <ReplyAll className="h-4 w-4 mr-1" />
              Reply All
            </Button>
          )}
          {onForward && (
            <Button variant="outline" size="sm" onClick={onForward}>
              <Forward className="h-4 w-4 mr-1" />
              Forward
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <LinkIcon className="h-4 w-4 mr-1" />
                Link to
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onLink?.("contact")}>
                <User className="h-4 w-4 mr-2" />
                Link to Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLink?.("company")}>
                <Building className="h-4 w-4 mr-2" />
                Link to Company
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLink?.("deal")}>
                <Target className="h-4 w-4 mr-2" />
                Link to Deal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email Info */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
            <span className="text-sm font-medium">
              {(displayEmail.fromName || displayEmail.fromEmail)[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {displayEmail.fromName || displayEmail.fromEmail}
              </span>
              <Badge variant="secondary" className="text-xs">
                {displayEmail.direction === "INBOUND" ? "Received" : "Sent"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{displayEmail.fromEmail}</div>
          </div>
          <div className="text-sm text-muted-foreground">{formatDate(date)}</div>
        </div>

        <div className="text-sm">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-8">To:</span>
            <span>{displayEmail.toEmails.join(", ")}</span>
          </div>
          {displayEmail.ccEmails.length > 0 && (
            <div className="flex gap-2 mt-1">
              <span className="text-muted-foreground w-8">Cc:</span>
              <span>{displayEmail.ccEmails.join(", ")}</span>
            </div>
          )}
        </div>

        {/* Linked Records */}
        {isLinked && (
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">Linked to:</span>
            {displayEmail.contact && (
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                {displayEmail.contact.firstName} {displayEmail.contact.lastName}
              </Badge>
            )}
            {displayEmail.company && (
              <Badge variant="secondary" className="gap-1">
                <Building className="h-3 w-3" />
                {displayEmail.company.name}
              </Badge>
            )}
            {displayEmail.deal && (
              <Badge variant="secondary" className="gap-1">
                <Target className="h-3 w-3" />
                {displayEmail.deal.title}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayEmail.bodyHtml ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: displayEmail.bodyHtml }}
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm">
            {displayEmail.bodyPreview || "(No content)"}
          </pre>
        )}
      </ScrollArea>

      {/* Attachments */}
      {displayEmail.attachments && displayEmail.attachments.length > 0 && (
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {displayEmail.attachments.length} Attachment
              {displayEmail.attachments.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {displayEmail.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium">{attachment.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadAttachment(attachment.id, attachment.name)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailDetail;
