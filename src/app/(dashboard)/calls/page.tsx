"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Phone, Plus, CalendarDays, Users, ArrowRight } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DailyCallList } from "@/components/calls/DailyCallList";
import { ScheduleCallForm } from "@/components/calls/ScheduleCallForm";
import { CallOutcomeDialog } from "@/components/calls/CallOutcomeDialog";

interface ScheduledCall {
  id: string;
  scheduledAt: string;
  status: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
}

export default function CallsPage() {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedCall, setSelectedCall] = useState<ScheduledCall | null>(null);
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScheduleSuccess = () => {
    setShowScheduleDialog(false);
    setRefreshKey((k) => k + 1);
  };

  const handleCallComplete = (call: ScheduledCall) => {
    setSelectedCall(call);
    setShowOutcomeDialog(true);
  };

  const handleOutcomeComplete = () => {
    setShowOutcomeDialog(false);
    setSelectedCall(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Calls"
          subtitle="Manage your scheduled calls and calling campaigns"
          actions={
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Call
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Schedule a Call</DialogTitle>
                </DialogHeader>
                <ScheduleCallForm
                  onSuccess={handleScheduleSuccess}
                  onCancel={() => setShowScheduleDialog(false)}
                />
              </DialogContent>
            </Dialog>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/calls/schedule">
                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <CardContent className="flex items-center gap-4 pt-6">
                    <div className="rounded-full bg-blue-100 p-3">
                      <CalendarDays className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Calendar View</h3>
                      <p className="text-sm text-muted-foreground">
                        View all scheduled calls
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/calls/campaigns">
                <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <CardContent className="flex items-center gap-4 pt-6">
                    <div className="rounded-full bg-purple-100 p-3">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Campaigns</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage call campaigns
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>

              <Card
                className="hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setShowScheduleDialog(true)}
              >
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="rounded-full bg-green-100 p-3">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Quick Schedule</h3>
                    <p className="text-sm text-muted-foreground">
                      Schedule a new call
                    </p>
                  </div>
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>

            {/* Today's Calls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Today&apos;s Calls - {format(new Date(), "EEEE, MMMM d")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DailyCallList
                  key={refreshKey}
                  date={new Date()}
                  onCallComplete={handleCallComplete}
                  onRefresh={() => setRefreshKey((k) => k + 1)}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Outcome Dialog */}
      <CallOutcomeDialog
        call={selectedCall}
        open={showOutcomeDialog}
        onOpenChange={setShowOutcomeDialog}
        onComplete={handleOutcomeComplete}
      />
    </div>
  );
}
