"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  MailOpen,
  Search,
  RefreshCw,
  Paperclip,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Building,
  Target,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Email, Mailbox } from "./types";

interface EmailListProps {
  mailboxes: Mailbox[];
  onEmailSelect?: (email: Email) => void;
  selectedEmailId?: string | null;
  className?: string;
}

export function EmailList({
  mailboxes,
  onEmailSelect,
  selectedEmailId,
  className,
}: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [linkedFilter, setLinkedFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 25;

  const fetchEmails = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("perPage", perPage.toString());

      if (selectedMailboxId && selectedMailboxId !== "all") {
        params.set("mailboxId", selectedMailboxId);
      }
      if (search) {
        params.set("search", search);
      }
      if (directionFilter && directionFilter !== "all") {
        params.set("direction", directionFilter);
      }
      if (linkedFilter === "linked") {
        params.set("linked", "true");
      } else if (linkedFilter === "unlinked") {
        params.set("linked", "false");
      }

      const res = await fetch(`/api/microsoft/emails?${params}`);
      const data = await res.json();

      if (data.success) {
        setEmails(data.data);
        setTotalPages(Math.ceil((data.total || 0) / perPage));
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, selectedMailboxId, search, directionFilter, linkedFilter]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmails();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const renderEmailItem = (email: Email) => {
    const isSelected = selectedEmailId === email.id;
    const date = email.direction === "INBOUND" ? email.receivedAt : email.sentAt;
    const isLinked = email.contactId || email.companyId || email.dealId;

    return (
      <div
        key={email.id}
        onClick={() => onEmailSelect?.(email)}
        className={cn(
          "px-4 py-3 border-b cursor-pointer transition-colors",
          isSelected ? "bg-blue-50" : "hover:bg-slate-50",
          !email.isRead && "bg-white font-medium"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Direction Icon */}
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              email.direction === "INBOUND" ? "bg-green-100" : "bg-blue-100"
            )}
          >
            {email.direction === "INBOUND" ? (
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowUpRight className="h-4 w-4 text-blue-600" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className={cn(
                  "truncate",
                  !email.isRead && "font-semibold"
                )}
              >
                {email.direction === "INBOUND"
                  ? email.fromName || email.fromEmail
                  : email.toEmails[0]}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(date)}
              </span>
            </div>

            <div
              className={cn(
                "text-sm truncate mb-1",
                !email.isRead ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {email.subject || "(No subject)"}
            </div>

            <div className="text-xs text-muted-foreground truncate">
              {email.bodyPreview}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-2">
              {email.hasAttachments && (
                <Paperclip className="h-3 w-3 text-slate-400" />
              )}

              {isLinked && (
                <div className="flex items-center gap-1">
                  {email.contact && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <User className="h-3 w-3" />
                      {email.contact.firstName}
                    </Badge>
                  )}
                  {email.company && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Building className="h-3 w-3" />
                      {email.company.name}
                    </Badge>
                  )}
                  {email.deal && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Target className="h-3 w-3" />
                      {email.deal.title}
                    </Badge>
                  )}
                </div>
              )}

              {!isLinked && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Not linked
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Filters */}
      <div className="p-4 border-b space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emails..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" type="submit">
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={() => fetchEmails(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </form>

        <div className="flex gap-2">
          {mailboxes.length > 1 && (
            <Select value={selectedMailboxId} onValueChange={setSelectedMailboxId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All mailboxes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Mailboxes</SelectItem>
                {mailboxes.map((mb) => (
                  <SelectItem key={mb.id} value={mb.id}>
                    {mb.mailboxEmail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="INBOUND">Received</SelectItem>
              <SelectItem value="OUTBOUND">Sent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={linkedFilter} onValueChange={setLinkedFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All emails</SelectItem>
              <SelectItem value="linked">Linked</SelectItem>
              <SelectItem value="unlinked">Not linked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Email List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : emails.length > 0 ? (
        <>
          <ScrollArea className="flex-1">
            {emails.map(renderEmailItem)}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <Mail className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="font-medium mb-1">No emails found</h3>
          <p className="text-sm text-muted-foreground">
            {search || directionFilter !== "all" || linkedFilter !== "all"
              ? "Try adjusting your filters"
              : "Emails will appear here once synced"}
          </p>
        </div>
      )}
    </div>
  );
}

export default EmailList;
