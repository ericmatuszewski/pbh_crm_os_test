"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  FileText,
  Code,
} from "lucide-react";
import { format } from "date-fns";
import { EmptyState, LoadingState } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const categories = [
  { value: "welcome", label: "Welcome" },
  { value: "follow-up", label: "Follow-up" },
  { value: "proposal", label: "Proposal" },
  { value: "reminder", label: "Reminder" },
  { value: "thank-you", label: "Thank You" },
  { value: "introduction", label: "Introduction" },
  { value: "other", label: "Other" },
];

const mergeFields = [
  { field: "{{contact.firstName}}", description: "Contact's first name" },
  { field: "{{contact.lastName}}", description: "Contact's last name" },
  { field: "{{contact.fullName}}", description: "Contact's full name" },
  { field: "{{contact.email}}", description: "Contact's email" },
  { field: "{{contact.title}}", description: "Contact's job title" },
  { field: "{{company.name}}", description: "Company name" },
  { field: "{{deal.title}}", description: "Deal title" },
  { field: "{{deal.value}}", description: "Deal value (formatted)" },
  { field: "{{user.name}}", description: "Your name" },
  { field: "{{user.email}}", description: "Your email" },
];

export default function CommunicationsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    category: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/email-templates");
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingTemplate
        ? `/api/email-templates/${editingTemplate.id}`
        : "/api/email-templates";

      const response = await fetch(url, {
        method: editingTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          category: formData.category || null,
        }),
      });

      if (response.ok) {
        fetchTemplates();
        setShowDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category || "",
      isActive: template.isActive,
    });
    setShowDialog(true);
  };

  const handleDeleteClick = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      const response = await fetch(`/api/email-templates/${templateToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          body: template.body,
          category: template.category,
          isActive: false,
        }),
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to duplicate template:", error);
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    // Replace merge fields with sample data for preview
    let preview = template.body;
    preview = preview.replace(/\{\{contact\.firstName\}\}/g, "John");
    preview = preview.replace(/\{\{contact\.lastName\}\}/g, "Smith");
    preview = preview.replace(/\{\{contact\.fullName\}\}/g, "John Smith");
    preview = preview.replace(/\{\{contact\.email\}\}/g, "john.smith@example.com");
    preview = preview.replace(/\{\{contact\.title\}\}/g, "Marketing Director");
    preview = preview.replace(/\{\{company\.name\}\}/g, "Acme Corp");
    preview = preview.replace(/\{\{deal\.title\}\}/g, "Enterprise License");
    preview = preview.replace(/\{\{deal\.value\}\}/g, "$25,000");
    preview = preview.replace(/\{\{user\.name\}\}/g, "Your Name");
    preview = preview.replace(/\{\{user\.email\}\}/g, "you@company.com");

    setPreviewHtml(preview);
    setShowPreview(true);
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      subject: "",
      body: "",
      category: "",
      isActive: true,
    });
  };

  const insertMergeField = (field: string) => {
    setFormData((prev) => ({
      ...prev,
      body: prev.body + field,
    }));
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Communications"
          subtitle="Email templates and communication tools"
          actions={
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? "Edit Template" : "Create Email Template"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g., Welcome Email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      placeholder="e.g., Welcome to {{company.name}}!"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Email Body</Label>
                      <div className="text-xs text-muted-foreground">
                        Supports merge fields
                      </div>
                    </div>
                    <textarea
                      value={formData.body}
                      onChange={(e) =>
                        setFormData({ ...formData, body: e.target.value })
                      }
                      className="w-full min-h-[200px] px-3 py-2 border rounded-md text-sm font-mono"
                      placeholder="Hi {{contact.firstName}},&#10;&#10;Thank you for your interest in our services..."
                      required
                    />
                  </div>

                  {/* Merge Fields Reference */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Available Merge Fields
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {mergeFields.map((field) => (
                          <Button
                            key={field.field}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs font-mono"
                            onClick={() => insertMergeField(field.field)}
                            title={field.description}
                          >
                            {field.field}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTemplate ? "Update Template" : "Create Template"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="templates" className="space-y-6">
            <TabsList>
              <TabsTrigger value="templates">Email Templates</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="templates">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <LoadingState message="Loading templates..." />
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No email templates yet</p>
                      <p className="text-sm">Create your first template to get started</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">
                              {template.name}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {template.subject}
                            </TableCell>
                            <TableCell>
                              {template.category && (
                                <Badge variant="secondary" className="capitalize">
                                  {template.category.replace("-", " ")}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={template.isActive ? "default" : "outline"}
                              >
                                {template.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(template.updatedAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePreview(template)}
                                  title="Preview"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(template)}
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDuplicate(template)}
                                  title="Duplicate"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(template)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Email Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">BCC Dropbox Address</h3>
                    <p className="text-sm text-muted-foreground">
                      BCC this address when sending emails from your email client to
                      automatically log them in the CRM.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value="dropbox@yourcrm.com"
                        className="font-mono bg-muted"
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigator.clipboard.writeText("dropbox@yourcrm.com")
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Default Signature</h3>
                    <p className="text-sm text-muted-foreground">
                      This signature will be appended to all outgoing emails.
                    </p>
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm"
                      placeholder="Best regards,&#10;{{user.name}}"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Preview Dialog */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Template Preview</DialogTitle>
              </DialogHeader>
              <div className="border rounded-lg p-4 bg-white">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {previewHtml}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{templateToDelete?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
