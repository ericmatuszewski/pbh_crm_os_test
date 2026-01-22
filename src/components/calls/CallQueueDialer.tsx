"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CallButton } from "./PhoneDialer";
import { CallOutcomeDialog } from "./CallOutcomeDialog";
import { toast } from "sonner";

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
  const [isLoading, setIsLoading] = useState(true);
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);

  const fetchNextContact = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/calls/campaigns/${campaign.id}/next`);
      const data = await response.json();
      if (data.success) {
        setCurrentItem(data.data);
      }
    } catch (error) {
      console.error("Error fetching next contact:", error);
      toast.error("Error fetching next contact", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    fetchNextContact();
  }, [fetchNextContact]);

  const handleCallStart = () => {
    setCallStartTime(new Date());
  };

  const handleRecordOutcome = async (outcome: string, notes?: string) => {
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
        fetchNextContact();
      }
    } catch (error) {
      console.error("Error recording outcome:", error);
      toast.error("Error recording outcome", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  };

  const handleSkip = async () => {
    if (!currentItem) return;

    try {
      // Move to next position (we'll just fetch next for now)
      fetchNextContact();
    } catch (error) {
      console.error("Error skipping contact:", error);
      toast.error("Error skipping contact", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  };

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
          <Button className="mt-6" onClick={fetchNextContact}>
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
            <p className="text-sm font-medium">Record Outcome:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                onClick={() => handleRecordOutcome("ANSWERED")}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Answered
              </Button>
              <Button
                variant="outline"
                className="bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-700"
                onClick={() => handleRecordOutcome("NO_ANSWER")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                No Answer
              </Button>
              <Button
                variant="outline"
                className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                onClick={() => handleRecordOutcome("VOICEMAIL")}
              >
                <Phone className="mr-2 h-4 w-4" />
                Voicemail
              </Button>
              <Button
                variant="outline"
                className="bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700"
                onClick={() => setShowOutcomeDialog(true)}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                More Options
              </Button>
            </div>
          </div>

          {/* Skip Button */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSkip}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip for Now
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
          fetchNextContact();
        }}
      />
    </div>
  );
}
