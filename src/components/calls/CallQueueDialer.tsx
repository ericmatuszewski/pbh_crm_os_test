"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  Phone,
  PhoneCall,
  User,
  Building2,
  Mail,
  SkipForward,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CallButton } from "./PhoneDialer";
import { CallOutcomeDialog } from "./CallOutcomeDialog";
import { toast } from "sonner";
import { useKeyboardShortcuts, KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/shared/KeyboardShortcutsHelp";

interface QueueItem {
  id: string;
  position: number;
  status: string;
  attempts: number;
  callbackAt?: string | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    title?: string | null;
    company?: { id: string; name: string } | null;
  };
  assignedTo?: { id: string; name: string | null } | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalCalls: number;
  completedCalls: number;
  successfulCalls: number;
}

interface CallQueueDialerProps {
  campaign: Campaign;
  onCampaignUpdate?: () => void;
}

export function CallQueueDialer({
  campaign,
  onCampaignUpdate,
}: CallQueueDialerProps) {
  const [currentItem, setCurrentItem] = useState<QueueItem | null>(null);
  const [prefetchedItem, setPrefetchedItem] = useState<QueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Fetch contacts with prefetch for instant transitions
  const fetchNextContact = useCallback(async (usePrefetch = false) => {
    // If we have a prefetched item, use it immediately for instant transition
    if (usePrefetch && prefetchedItem) {
      setCurrentItem(prefetchedItem);
      setPrefetchedItem(null);
      // Fetch next prefetch in background (don't show loading)
      fetch(`/api/calls/campaigns/${campaign.id}/next`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.prefetch) {
            setPrefetchedItem(data.prefetch);
          }
        })
        .catch(console.error);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/calls/campaigns/${campaign.id}/next`);
      const data = await response.json();
      if (data.success) {
        setCurrentItem(data.data);
        setPrefetchedItem(data.prefetch || null);
      }
    } catch (error) {
      console.error("Error fetching next contact:", error);
      toast.error("Error fetching next contact", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsLoading(false);
    }
  }, [campaign.id, prefetchedItem]);

  useEffect(() => {
    fetchNextContact();
  }, [fetchNextContact]);

  const handleCallStart = useCallback(() => {
    setCallStartTime(new Date());
  }, []);

  const handleRecordOutcome = useCallback(async (outcome: string, notes?: string) => {
    if (!currentItem) return;

    try {
      const duration = callStartTime
        ? Math.round((new Date().getTime() - callStartTime.getTime()) / 60000)
        : undefined;

      const response = await fetch(
        `/api/calls/queue/${currentItem.id}/outcome`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcome, notes, duration }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setCallStartTime(null);
        onCampaignUpdate?.();
        // Use prefetch for instant transition
        fetchNextContact(true);
      }
    } catch (error) {
      console.error("Error recording outcome:", error);
      toast.error("Error recording outcome", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  }, [currentItem, callStartTime, onCampaignUpdate, fetchNextContact]);

  const handleSkip = useCallback(async () => {
    if (!currentItem) return;

    try {
      // Use prefetch for instant transition
      fetchNextContact(true);
    } catch (error) {
      console.error("Error skipping contact:", error);
      toast.error("Error skipping contact", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  }, [currentItem, fetchNextContact]);

  // Handler for Check for More button (no prefetch, fresh fetch)
  const handleCheckForMore = useCallback(() => {
    fetchNextContact(false);
  }, [fetchNextContact]);

  // Dial the current contact's phone number
  const handleDial = useCallback(() => {
    if (currentItem?.contact.phone) {
      window.location.href = `tel:${currentItem.contact.phone}`;
      handleCallStart();
    }
  }, [currentItem?.contact.phone, handleCallStart]);

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    {
      key: "1",
      action: () => currentItem && handleRecordOutcome("ANSWERED"),
      description: "Mark as Answered",
      category: "Outcomes",
    },
    {
      key: "2",
      action: () => currentItem && handleRecordOutcome("NO_ANSWER"),
      description: "Mark as No Answer",
      category: "Outcomes",
    },
    {
      key: "3",
      action: () => currentItem && handleRecordOutcome("VOICEMAIL"),
      description: "Mark as Voicemail",
      category: "Outcomes",
    },
    {
      key: "4",
      action: () => currentItem && handleRecordOutcome("BUSY"),
      description: "Mark as Busy",
      category: "Outcomes",
    },
    {
      key: "5",
      action: () => currentItem && setShowOutcomeDialog(true),
      description: "More outcome options",
      category: "Outcomes",
    },
    {
      key: "d",
      action: handleDial,
      description: "Dial phone number",
      category: "Actions",
    },
    {
      key: "n",
      action: handleSkip,
      description: "Skip to next contact",
      category: "Actions",
    },
    {
      key: "?",
      action: () => setShowShortcutsHelp(true),
      description: "Show keyboard shortcuts",
      category: "Help",
    },
    {
      key: "Escape",
      action: () => {
        setShowOutcomeDialog(false);
        setShowShortcutsHelp(false);
      },
      description: "Close dialogs",
      category: "Help",
    },
  ], [currentItem, handleRecordOutcome, handleSkip, handleDial]);

  // Register keyboard shortcuts
  useKeyboardShortcuts(shortcuts, { enabled: !isLoading && !!currentItem });

  const progress = campaign.totalCalls > 0
    ? Math.round((campaign.completedCalls / campaign.totalCalls) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Queue Complete!</h3>
          <p className="text-muted-foreground mb-4">
            You&apos;ve completed all contacts in this campaign.
          </p>
          <div className="text-sm text-muted-foreground">
            {campaign.completedCalls} of {campaign.totalCalls} calls completed •{" "}
            {campaign.successfulCalls} successful
          </div>
          <Button className="mt-6" onClick={handleCheckForMore}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Check for More
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Campaign Progress</span>
            <span className="text-sm text-muted-foreground">
              {campaign.completedCalls} / {campaign.totalCalls}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{progress}% complete</span>
            <span>{campaign.successfulCalls} successful</span>
          </div>
        </CardContent>
      </Card>

      {/* Current Contact Card */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current Contact
            </CardTitle>
            <Badge variant="outline">
              #{currentItem.position} in queue
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-semibold">
                {currentItem.contact.firstName} {currentItem.contact.lastName}
              </h3>
              {currentItem.contact.title && (
                <p className="text-muted-foreground">
                  {currentItem.contact.title}
                </p>
              )}
            </div>

            {currentItem.contact.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{currentItem.contact.company.name}</span>
              </div>
            )}

            {currentItem.contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${currentItem.contact.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {currentItem.contact.email}
                </a>
              </div>
            )}

            {currentItem.contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{currentItem.contact.phone}</span>
              </div>
            )}

            {currentItem.attempts > 0 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <Clock className="h-4 w-4" />
                <span>
                  {currentItem.attempts} previous attempt
                  {currentItem.attempts > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {currentItem.callbackAt && (
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <Clock className="h-4 w-4" />
                <span>
                  Callback scheduled for{" "}
                  {format(new Date(currentItem.callbackAt), "PPp")}
                </span>
              </div>
            )}
          </div>

          {/* Call Actions */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {currentItem.contact.phone ? (
              <>
                <CallButton
                  phoneNumber={currentItem.contact.phone}
                  contactName={`${currentItem.contact.firstName} ${currentItem.contact.lastName}`}
                  onCallStart={handleCallStart}
                />
                {callStartTime && (
                  <p className="text-sm text-center text-muted-foreground">
                    Call started at {format(callStartTime, "h:mm a")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">
                No phone number available
              </p>
            )}
          </div>

          {/* Outcome Buttons */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Record Outcome:</p>
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Keyboard className="h-3 w-3" />
                Press ? for shortcuts
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="bg-green-50 border-green-200 hover:bg-green-100 text-green-700 justify-between"
                onClick={() => handleRecordOutcome("ANSWERED")}
              >
                <span className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Answered
                </span>
                <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 border border-green-300 rounded">1</kbd>
              </Button>
              <Button
                variant="outline"
                className="bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-700 justify-between"
                onClick={() => handleRecordOutcome("NO_ANSWER")}
              >
                <span className="flex items-center">
                  <XCircle className="mr-2 h-4 w-4" />
                  No Answer
                </span>
                <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 border border-yellow-300 rounded">2</kbd>
              </Button>
              <Button
                variant="outline"
                className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 justify-between"
                onClick={() => handleRecordOutcome("VOICEMAIL")}
              >
                <span className="flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  Voicemail
                </span>
                <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 border border-blue-300 rounded">3</kbd>
              </Button>
              <Button
                variant="outline"
                className="bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700 justify-between"
                onClick={() => handleRecordOutcome("BUSY")}
              >
                <span className="flex items-center">
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Busy
                </span>
                <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-orange-100 border border-orange-300 rounded">4</kbd>
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700 justify-between"
              onClick={() => setShowOutcomeDialog(true)}
            >
              <span className="flex items-center">
                <ArrowRight className="mr-2 h-4 w-4" />
                More Options (Callback, Not Interested, etc.)
              </span>
              <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 border border-purple-300 rounded">5</kbd>
            </Button>
          </div>

          {/* Skip Button */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={handleSkip}
            >
              <span className="flex items-center">
                <SkipForward className="mr-2 h-4 w-4" />
                Skip for Now
              </span>
              <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 border border-slate-300 rounded">N</kbd>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outcome Dialog for more options */}
      <CallOutcomeDialog
        call={
          currentItem
            ? {
                id: currentItem.id,
                scheduledAt: new Date().toISOString(),
                contact: currentItem.contact,
              }
            : null
        }
        open={showOutcomeDialog}
        onOpenChange={setShowOutcomeDialog}
        onComplete={() => {
          onCampaignUpdate?.();
          fetchNextContact(true); // Use prefetch for instant transition
        }}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
        shortcuts={shortcuts}
        title="Dialer Shortcuts"
      />
    </div>
  );
}
