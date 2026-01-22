"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Building2,
  Users,
  FileText,
  Briefcase,
  Loader2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Business {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  primaryColor: string;
  logoUrl: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  parent: Business | null;
  children: Business[];
  _count: {
    users: number;
    contacts: number;
    companies: number;
    deals: number;
    quotes: number;
    products: number;
  };
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    legalName: "",
    primaryColor: "#2563eb",
    parentId: "",
  });

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/businesses?all=true");
      const data = await response.json();
      if (data.success) {
        setBusinesses(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      toast.error("Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleOpenDialog = (business?: Business) => {
    if (business) {
      setEditingBusiness(business);
      setFormData({
        name: business.name,
        slug: business.slug,
        legalName: business.legalName || "",
        primaryColor: business.primaryColor,
        parentId: business.parentId || "",
      });
    } else {
      setEditingBusiness(null);
      setFormData({
        name: "",
        slug: "",
        legalName: "",
        primaryColor: "#2563eb",
        parentId: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        ...formData,
        legalName: formData.legalName || null,
        parentId: formData.parentId || null,
      };

      const url = editingBusiness
        ? `/api/businesses/${editingBusiness.id}`
        : "/api/businesses";
      const method = editingBusiness ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(
          editingBusiness
            ? "Business updated successfully"
            : "Business created successfully"
        );
        setDialogOpen(false);
        fetchBusinesses();
      } else {
        toast.error(data.error?.message || data.error || "Failed to save business");
      }
    } catch (error) {
      console.error("Failed to save business:", error);
      toast.error("Failed to save business");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (business: Business) => {
    try {
      const response = await fetch(`/api/businesses/${business.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !business.isActive }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(
          business.isActive
            ? "Business deactivated"
            : "Business activated"
        );
        fetchBusinesses();
      }
    } catch (error) {
      console.error("Failed to toggle business:", error);
      toast.error("Failed to update business");
    }
  };

  // Organize businesses into hierarchy
  const parentBusinesses = businesses.filter((b) => !b.parentId);
  const getChildBusinesses = (parentId: string) =>
    businesses.filter((b) => b.parentId === parentId);

  const renderBusinessRow = (business: Business, isChild: boolean = false) => (
    <TableRow key={business.id}>
      <TableCell>
        <div className={`flex items-center gap-3 ${isChild ? "pl-6" : ""}`}>
          {isChild && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          {business.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-8 w-8 rounded object-contain"
            />
          ) : (
            <div
              className="h-8 w-8 rounded flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: business.primaryColor }}
            >
              {business.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-medium flex items-center gap-2">
              {business.name}
              {!business.parentId && (
                <Badge variant="outline">Parent</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {business.slug}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {business.legalName || (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {business._count.users}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {business._count.deals}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {business._count.quotes}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Switch
          checked={business.isActive}
          onCheckedChange={() => handleToggleActive(business)}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog(business)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Link href={`/settings/business?id=${business.id}`}>
            <Button variant="ghost" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Business Management</h1>
          </div>
          <p className="text-muted-foreground">
            Create and manage businesses in your organization
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Business
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Businesses</CardTitle>
          <CardDescription>
            {businesses.length} total businesses (
            {businesses.filter((b) => b.isActive).length} active)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No businesses yet. Click &quot;Add Business&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Legal Name</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parentBusinesses.map((parent) => (
                  <>
                    {renderBusinessRow(parent, false)}
                    {getChildBusinesses(parent.id).map((child) =>
                      renderBusinessRow(child, true)
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Business Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingBusiness ? "Edit Business" : "Create Business"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: editingBusiness
                        ? formData.slug
                        : e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, ""),
                    });
                  }}
                  placeholder="My Business"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="my-business"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                value={formData.legalName}
                onChange={(e) =>
                  setFormData({ ...formData, legalName: e.target.value })
                }
                placeholder="My Business Ltd"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Business</Label>
                <Select
                  value={formData.parentId || "__none__"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parentId: value === "__none__" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Parent Business)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      None (Parent Business)
                    </SelectItem>
                    {parentBusinesses
                      .filter((b) => b.id !== editingBusiness?.id)
                      .map((business) => (
                        <SelectItem key={business.id} value={business.id}>
                          {business.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="primaryColor"
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryColor: e.target.value })
                    }
                    className="w-14 h-10 p-1"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryColor: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.slug}
            >
              {saving ? "Saving..." : editingBusiness ? "Save Changes" : "Create Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
