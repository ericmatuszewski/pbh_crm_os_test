"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, FileText, Eye, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { QuoteTemplate } from "@/types";

export default function QuoteTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<QuoteTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isDefault: false,
    isActive: true,
    headerHtml: "",
    footerHtml: "",
    termsConditions: "",
    paymentTerms: "",
    notes: "",
    logoUrl: "",
    primaryColor: "#6366f1",
    defaultDiscountPercent: "",
    defaultTaxRate: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/quote-templates");
      const result = await response.json();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch quote templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template?: QuoteTemplate) => {
    if (template) {
      setEditingId(template.id);
      setFormData({
        name: template.name,
        description: template.description || "",
        isDefault: template.isDefault,
        isActive: template.isActive,
        headerHtml: template.headerHtml || "",
        footerHtml: template.footerHtml || "",
        termsConditions: template.termsConditions || "",
        paymentTerms: template.paymentTerms || "",
        notes: template.notes || "",
        logoUrl: template.logoUrl || "",
        primaryColor: template.primaryColor || "#6366f1",
        defaultDiscountPercent: template.defaultDiscountPercent?.toString() || "",
        defaultTaxRate: template.defaultTaxRate?.toString() || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        isDefault: false,
        isActive: true,
        headerHtml: "",
        footerHtml: "",
        termsConditions: "",
        paymentTerms: "",
        notes: "",
        logoUrl: "",
        primaryColor: "#6366f1",
        defaultDiscountPercent: "",
        defaultTaxRate: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      description: formData.description || null,
      isDefault: formData.isDefault,
      isActive: formData.isActive,
      headerHtml: formData.headerHtml || null,
      footerHtml: formData.footerHtml || null,
      termsConditions: formData.termsConditions || null,
      paymentTerms: formData.paymentTerms || null,
      notes: formData.notes || null,
      logoUrl: formData.logoUrl || null,
      primaryColor: formData.primaryColor,
      defaultDiscountPercent: formData.defaultDiscountPercent
        ? parseFloat(formData.defaultDiscountPercent)
        : null,
      defaultTaxRate: formData.defaultTaxRate
        ? parseFloat(formData.defaultTaxRate)
        : null,
    };

    try {
      const url = editingId ? `/api/quote-templates/${editingId}` : "/api/quote-templates";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Template ${editingId ? "updated" : "created"} successfully`,
        });
        setIsDialogOpen(false);
        fetchTemplates();
      } else {
        throw new Error(result.error?.message || "Failed to save template");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/quote-templates/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Template deleted successfully",
        });
        fetchTemplates();
      } else {
        throw new Error(result.error?.message || "Failed to delete template");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handlePreview = (template: QuoteTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quote Templates</h1>
          <p className="text-muted-foreground">
            Create reusable templates for quotes with default values and styling
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Templates Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Default Discount</TableHead>
              <TableHead>Default Tax</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: template.primaryColor || "#6366f1" }}
                    />
                    <span className="font-medium">{template.name}</span>
                    {template.isDefault && (
                      <Badge variant="secondary" className="ml-2">Default</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {template.description || "-"}
                </TableCell>
                <TableCell>
                  {template.defaultDiscountPercent
                    ? `${template.defaultDiscountPercent}%`
                    : "-"}
                </TableCell>
                <TableCell>
                  {template.defaultTaxRate
                    ? `${template.defaultTaxRate}%`
                    : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePreview(template)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(template)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(template.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredTemplates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No templates found. Create your first quote template.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              Define default values and content for quote generation
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="terms">Terms</TabsTrigger>
                <TabsTrigger value="styling">Styling</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Standard Quote, Enterprise Quote"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="When to use this template..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultDiscountPercent">Default Discount %</Label>
                    <Input
                      id="defaultDiscountPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.defaultDiscountPercent}
                      onChange={(e) => setFormData({ ...formData, defaultDiscountPercent: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultTaxRate">Default Tax Rate %</Label>
                    <Input
                      id="defaultTaxRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.defaultTaxRate}
                      onChange={(e) => setFormData({ ...formData, defaultTaxRate: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Default Template</Label>
                    <p className="text-sm text-muted-foreground">
                      Use this template by default for new quotes
                    </p>
                  </div>
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Available for selection when creating quotes
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="headerHtml">Header Content (HTML)</Label>
                  <Textarea
                    id="headerHtml"
                    value={formData.headerHtml}
                    onChange={(e) => setFormData({ ...formData, headerHtml: e.target.value })}
                    rows={4}
                    placeholder="<p>Company Introduction...</p>"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available merge fields: {"{{companyName}}"}, {"{{contactName}}"}, {"{{quoteNumber}}"}, {"{{issueDate}}"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footerHtml">Footer Content (HTML)</Label>
                  <Textarea
                    id="footerHtml"
                    value={formData.footerHtml}
                    onChange={(e) => setFormData({ ...formData, footerHtml: e.target.value })}
                    rows={4}
                    placeholder="<p>Thank you for your business!</p>"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Default Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Additional notes to include on quotes..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="terms" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="termsConditions">Terms & Conditions</Label>
                  <Textarea
                    id="termsConditions"
                    value={formData.termsConditions}
                    onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
                    rows={6}
                    placeholder="1. Payment is due within 30 days of invoice date.&#10;2. ..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Textarea
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    rows={3}
                    placeholder="Net 30, 50% upfront, etc."
                  />
                </div>
              </TabsContent>

              <TabsContent value="styling" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  {formData.logoUrl && (
                    <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                      <img
                        src={formData.logoUrl}
                        alt="Logo preview"
                        className="max-h-16 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for headers, accents, and branding elements in the quote PDF
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-6">
              {/* Header Preview */}
              {previewTemplate.logoUrl && (
                <div className="flex items-center gap-4 pb-4 border-b">
                  <img
                    src={previewTemplate.logoUrl}
                    alt="Company logo"
                    className="max-h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {previewTemplate.headerHtml && (
                <div className="prose prose-sm max-w-none">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Header</h4>
                  <div
                    className="p-4 bg-muted/50 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: previewTemplate.headerHtml }}
                  />
                </div>
              )}

              {/* Sample Quote Content */}
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">Quote #QT-2024-001</h3>
                    <p className="text-sm text-muted-foreground">Sample Company</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Issue Date: {new Date().toLocaleDateString()}</p>
                    <p>Valid Until: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                  </div>
                </div>

                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr
                      className="text-white"
                      style={{ backgroundColor: previewTemplate.primaryColor || "#6366f1" }}
                    >
                      <th className="text-left p-2">Item</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Price</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">Sample Product</td>
                      <td className="text-right p-2">1</td>
                      <td className="text-right p-2">$100.00</td>
                      <td className="text-right p-2">$100.00</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="text-right p-2">Subtotal</td>
                      <td className="text-right p-2">$100.00</td>
                    </tr>
                    {previewTemplate.defaultDiscountPercent && (
                      <tr>
                        <td colSpan={3} className="text-right p-2">
                          Discount ({previewTemplate.defaultDiscountPercent}%)
                        </td>
                        <td className="text-right p-2 text-destructive">
                          -${(100 * previewTemplate.defaultDiscountPercent / 100).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {previewTemplate.defaultTaxRate && (
                      <tr>
                        <td colSpan={3} className="text-right p-2">
                          Tax ({previewTemplate.defaultTaxRate}%)
                        </td>
                        <td className="text-right p-2">
                          ${((100 - (previewTemplate.defaultDiscountPercent || 0)) * previewTemplate.defaultTaxRate / 100).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr className="font-semibold">
                      <td colSpan={3} className="text-right p-2">Total</td>
                      <td className="text-right p-2">
                        ${(
                          100 -
                          (previewTemplate.defaultDiscountPercent ? 100 * previewTemplate.defaultDiscountPercent / 100 : 0) +
                          (previewTemplate.defaultTaxRate
                            ? (100 - (previewTemplate.defaultDiscountPercent || 0)) * previewTemplate.defaultTaxRate / 100
                            : 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes */}
              {previewTemplate.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {previewTemplate.notes}
                  </p>
                </div>
              )}

              {/* Payment Terms */}
              {previewTemplate.paymentTerms && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Payment Terms</h4>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {previewTemplate.paymentTerms}
                  </p>
                </div>
              )}

              {/* Terms & Conditions */}
              {previewTemplate.termsConditions && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Terms & Conditions</h4>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {previewTemplate.termsConditions}
                  </p>
                </div>
              )}

              {/* Footer */}
              {previewTemplate.footerHtml && (
                <div className="prose prose-sm max-w-none">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Footer</h4>
                  <div
                    className="p-4 bg-muted/50 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: previewTemplate.footerHtml }}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
