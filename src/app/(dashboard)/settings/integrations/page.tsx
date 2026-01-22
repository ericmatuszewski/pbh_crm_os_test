"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import { MicrosoftConnectionCard, EmailList, EmailDetail, EmailComposer } from "@/components/microsoft";
import type { Email, Mailbox } from "@/components/microsoft/types";
import {
  Mail,
  Plus,
  Inbox,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Trash2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <IntegrationsPageContent />
    </Suspense>
  );
}

function IntegrationsPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("connection");
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMailboxOpen, setIsAddMailboxOpen] = useState(false);
  const [newMailboxEmail, setNewMailboxEmail] = useState("");
  const [addingMailbox, setAddingMailbox] = useState(false);
  const [syncingMailboxId, setSyncingMailboxId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"new" | "reply" | "replyAll" | "forward">("new");

  // Check for OAuth callback params
  useEffect(() => {
    if (!searchParams) return;

    const microsoftStatus = searchParams.get("microsoft");
    const email = searchParams.get("email");
    const error = searchParams.get("error");

    if (microsoftStatus === "connected") {
      // Show success message
      console.log("Microsoft connected successfully", email);
      fetchMailboxes();
    }

    if (error) {
      console.error("Microsoft OAuth error:", error);
    }
  }, [searchParams]);

  const fetchMailboxes = useCallback(async () => {
    try {
      const res = await fetch("/api/microsoft/mailboxes");
      const data = await res.json();
      if (data.success) {
        setMailboxes(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch mailboxes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMailboxes();
  }, [fetchMailboxes]);

  const handleAddMailbox = async () => {
    if (!newMailboxEmail.trim()) return;

    setAddingMailbox(true);
    try {
      const res = await fetch("/api/microsoft/mailboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxEmail: newMailboxEmail.trim(),
        }),
      });

      if (res.ok) {
        setNewMailboxEmail("");
        setIsAddMailboxOpen(false);
        fetchMailboxes();
      }
    } catch (error) {
      console.error("Failed to add mailbox:", error);
    } finally {
      setAddingMailbox(false);
    }
  };

  const handleSyncMailbox = async (mailboxId: string) => {
    setSyncingMailboxId(mailboxId);
    try {
      await fetch(`/api/microsoft/mailboxes/${mailboxId}/sync`, {
        method: "POST",
      });
      fetchMailboxes();
    } catch (error) {
      console.error("Failed to sync mailbox:", error);
    } finally {
      setSyncingMailboxId(null);
    }
  };

  const handleDeleteMailbox = async (mailbox: Mailbox) => {
    if (!window.confirm(`Remove mailbox "${mailbox.mailboxEmail}"? Emails will be preserved.`)) {
      return;
    }

    try {
      await fetch(`/api/microsoft/mailboxes/${mailbox.id}`, {
        method: "DELETE",
      });
      fetchMailboxes();
    } catch (error) {
      console.error("Failed to delete mailbox:", error);
    }
  };

  const handleToggleSync = async (mailbox: Mailbox, type: "inbound" | "outbound") => {
    try {
      await fetch(`/api/microsoft/mailboxes/${mailbox.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syncInbound: type === "inbound" ? !mailbox.syncInbound : mailbox.syncInbound,
          syncOutbound: type === "outbound" ? !mailbox.syncOutbound : mailbox.syncOutbound,
        }),
      });
      fetchMailboxes();
    } catch (error) {
      console.error("Failed to update mailbox:", error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  const openComposer = (mode: "new" | "reply" | "replyAll" | "forward" = "new") => {
    setComposerMode(mode);
    setIsComposerOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Integrations"
          subtitle="Connect external services and sync data"
          actions={
            activeTab === "emails" && (
              <Button onClick={() => openComposer("new")}>
                <Send className="w-4 h-4 mr-2" />
                Compose Email
              </Button>
            )
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="connection" className="gap-2">
                <Settings className="h-4 w-4" />
                Connection
              </TabsTrigger>
              <TabsTrigger value="mailboxes" className="gap-2">
                <Inbox className="h-4 w-4" />
                Mailboxes
              </TabsTrigger>
              <TabsTrigger value="emails" className="gap-2">
                <Mail className="h-4 w-4" />
                Emails
              </TabsTrigger>
            </TabsList>

            {/* Connection Tab */}
            <TabsContent value="connection">
              <div className="max-w-2xl">
                <MicrosoftConnectionCard onConnectionChange={fetchMailboxes} />
              </div>
            </TabsContent>

            {/* Mailboxes Tab */}
            <TabsContent value="mailboxes">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Synced Mailboxes</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure which mailboxes to sync emails from
                    </p>
                  </div>
                  <Button onClick={() => setIsAddMailboxOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Mailbox
                  </Button>
                </div>

                {loading ? (
                  <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                    Loading...
                  </div>
                ) : mailboxes.length > 0 ? (
                  <div className="bg-white rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mailbox</TableHead>
                          <TableHead>Sync Status</TableHead>
                          <TableHead>Emails</TableHead>
                          <TableHead>Last Sync</TableHead>
                          <TableHead>Inbound</TableHead>
                          <TableHead>Outbound</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mailboxes.map((mailbox) => (
                          <TableRow key={mailbox.id}>
                            <TableCell className="font-medium">
                              {mailbox.mailboxEmail}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  mailbox.syncStatus === "ACTIVE" &&
                                    "bg-green-100 text-green-700",
                                  mailbox.syncStatus === "ERROR" &&
                                    "bg-red-100 text-red-700",
                                  mailbox.syncStatus === "PAUSED" &&
                                    "bg-yellow-100 text-yellow-700"
                                )}
                              >
                                {mailbox.syncStatus === "ACTIVE" && (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                {mailbox.syncStatus === "ERROR" && (
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                {mailbox.syncStatus === "PAUSED" && (
                                  <Clock className="h-3 w-3 mr-1" />
                                )}
                                {mailbox.syncStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>{mailbox._count?.emails || 0}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(mailbox.lastSyncAt)}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={mailbox.syncInbound}
                                onCheckedChange={() =>
                                  handleToggleSync(mailbox, "inbound")
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={mailbox.syncOutbound}
                                onCheckedChange={() =>
                                  handleToggleSync(mailbox, "outbound")
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSyncMailbox(mailbox.id)}
                                  disabled={syncingMailboxId === mailbox.id}
                                >
                                  <RefreshCw
                                    className={cn(
                                      "h-4 w-4",
                                      syncingMailboxId === mailbox.id && "animate-spin"
                                    )}
                                  />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteMailbox(mailbox)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border">
                    <EmptyState
                      icon={<Inbox className="h-12 w-12" />}
                      title="No mailboxes configured"
                      description="Add a mailbox to start syncing emails with your CRM."
                      action={{
                        label: "Add Mailbox",
                        onClick: () => setIsAddMailboxOpen(true),
                      }}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Emails Tab */}
            <TabsContent value="emails" className="h-[calc(100vh-220px)]">
              <div className="flex h-full gap-4 bg-white rounded-lg border overflow-hidden">
                {/* Email List */}
                <div className="w-[400px] border-r">
                  <EmailList
                    mailboxes={mailboxes}
                    onEmailSelect={setSelectedEmail}
                    selectedEmailId={selectedEmail?.id}
                  />
                </div>

                {/* Email Detail */}
                <div className="flex-1">
                  {selectedEmail ? (
                    <EmailDetail
                      email={selectedEmail}
                      onReply={() => openComposer("reply")}
                      onReplyAll={() => openComposer("replyAll")}
                      onForward={() => openComposer("forward")}
                      onClose={() => setSelectedEmail(null)}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <Mail className="h-12 w-12 text-slate-300 mb-4" />
                      <h3 className="font-medium mb-1">Select an email</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose an email from the list to view its contents
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Add Mailbox Dialog */}
      <Dialog open={isAddMailboxOpen} onOpenChange={setIsAddMailboxOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mailbox</DialogTitle>
            <DialogDescription>
              Enter the email address of the mailbox you want to sync. This can be
              a personal or shared mailbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mailboxEmail">Email Address</Label>
              <Input
                id="mailboxEmail"
                type="email"
                value={newMailboxEmail}
                onChange={(e) => setNewMailboxEmail(e.target.value)}
                placeholder="sales@company.com"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddMailboxOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMailbox} disabled={addingMailbox || !newMailboxEmail.trim()}>
              {addingMailbox ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Mailbox"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Composer Dialog */}
      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <EmailComposer
            mailboxes={mailboxes}
            mode={composerMode}
            defaultTo={
              composerMode === "reply" || composerMode === "replyAll"
                ? [selectedEmail?.fromEmail || ""]
                : composerMode === "forward"
                ? []
                : []
            }
            defaultSubject={
              composerMode === "reply" || composerMode === "replyAll"
                ? `Re: ${selectedEmail?.subject || ""}`
                : composerMode === "forward"
                ? `Fwd: ${selectedEmail?.subject || ""}`
                : ""
            }
            defaultBody={
              composerMode === "forward"
                ? `\n\n---------- Forwarded message ----------\nFrom: ${selectedEmail?.fromName || selectedEmail?.fromEmail}\nDate: ${selectedEmail?.sentAt || selectedEmail?.receivedAt}\nSubject: ${selectedEmail?.subject}\n\n${selectedEmail?.bodyPreview || ""}`
                : ""
            }
            replyToMessageId={
              composerMode === "reply" || composerMode === "replyAll"
                ? selectedEmail?.graphMessageId
                : undefined
            }
            forwardMessageId={composerMode === "forward" ? selectedEmail?.graphMessageId : undefined}
            onSend={() => {
              setIsComposerOpen(false);
              // Refresh email list
            }}
            onClose={() => setIsComposerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
