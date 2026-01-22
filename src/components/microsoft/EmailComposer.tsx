"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Send,
  X,
  Paperclip,
  Bold,
  Italic,
  Underline,
  List,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Mailbox {
  id: string;
  mailboxEmail: string;
}

interface Attachment {
  file: File;
  id: string;
}

interface EmailComposerProps {
  mailboxes: Mailbox[];
  defaultFrom?: string;
  defaultTo?: string[];
  defaultCc?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  replyToMessageId?: string;
  forwardMessageId?: string;
  mode?: "new" | "reply" | "replyAll" | "forward";
  onSend?: () => void;
  onClose?: () => void;
  className?: string;
}

export function EmailComposer({
  mailboxes,
  defaultFrom,
  defaultTo = [],
  defaultCc = [],
  defaultSubject = "",
  defaultBody = "",
  replyToMessageId,
  forwardMessageId,
  mode = "new",
  onSend,
  onClose,
  className,
}: EmailComposerProps) {
  const [from, setFrom] = useState(defaultFrom || mailboxes[0]?.mailboxEmail || "");
  const [to, setTo] = useState<string[]>(defaultTo);
  const [cc, setCc] = useState<string[]>(defaultCc);
  const [showCc, setShowCc] = useState(defaultCc.length > 0);
  const [showBcc, setShowBcc] = useState(false);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddRecipient = (
    email: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = email.trim();
    if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setter((prev) => [...new Set([...prev, trimmed])]);
      inputSetter("");
    }
  };

  const handleRemoveRecipient = (
    email: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => prev.filter((e) => e !== email));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    email: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      handleAddRecipient(email, setter, inputSetter);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAttachments = Array.from(files).map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = async () => {
    if (to.length === 0) {
      setError("Please add at least one recipient");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("from", from);
      formData.append("to", JSON.stringify(to));
      formData.append("cc", JSON.stringify(cc));
      formData.append("bcc", JSON.stringify(bcc));
      formData.append("subject", subject);
      formData.append("body", body);

      if (replyToMessageId) {
        formData.append("replyToMessageId", replyToMessageId);
      }
      if (forwardMessageId) {
        formData.append("forwardMessageId", forwardMessageId);
      }

      attachments.forEach((attachment) => {
        formData.append("attachments", attachment.file);
      });

      const res = await fetch("/api/microsoft/emails/send", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        onSend?.();
      } else {
        setError(data.error?.message || "Failed to send email");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getModeTitle = () => {
    switch (mode) {
      case "reply":
        return "Reply";
      case "replyAll":
        return "Reply All";
      case "forward":
        return "Forward";
      default:
        return "New Email";
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">{getModeTitle()}</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {/* From */}
          <div className="flex items-center gap-3">
            <Label className="w-12 text-right text-muted-foreground">From</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mailboxes.map((mb) => (
                  <SelectItem key={mb.id} value={mb.mailboxEmail}>
                    {mb.mailboxEmail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To */}
          <div className="flex items-start gap-3">
            <Label className="w-12 text-right text-muted-foreground pt-2">To</Label>
            <div className="flex-1">
              <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px]">
                {to.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      onClick={() => handleRemoveRecipient(email, setTo)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, toInput, setTo, setToInput)}
                  onBlur={() => handleAddRecipient(toInput, setTo, setToInput)}
                  placeholder={to.length === 0 ? "Add recipients" : ""}
                  className="flex-1 min-w-[100px] outline-none text-sm bg-transparent"
                />
              </div>
              <div className="flex gap-2 mt-1">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Add Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Add Bcc
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-start gap-3">
              <Label className="w-12 text-right text-muted-foreground pt-2">Cc</Label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px]">
                  {cc.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        onClick={() => handleRemoveRecipient(email, setCc)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, ccInput, setCc, setCcInput)}
                    onBlur={() => handleAddRecipient(ccInput, setCc, setCcInput)}
                    placeholder=""
                    className="flex-1 min-w-[100px] outline-none text-sm bg-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="flex items-start gap-3">
              <Label className="w-12 text-right text-muted-foreground pt-2">Bcc</Label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px]">
                  {bcc.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        onClick={() => handleRemoveRecipient(email, setBcc)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, bccInput, setBcc, setBccInput)}
                    onBlur={() => handleAddRecipient(bccInput, setBcc, setBccInput)}
                    placeholder=""
                    className="flex-1 min-w-[100px] outline-none text-sm bg-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-3">
            <Label className="w-12 text-right text-muted-foreground">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1"
            />
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pb-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="min-h-[200px] resize-none"
          />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Attachments</span>
            </div>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium">{attachment.file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file.size)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 mr-1" />
            Attach
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Discard
            </Button>
          )}
          <Button onClick={handleSend} disabled={sending || to.length === 0}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EmailComposer;
