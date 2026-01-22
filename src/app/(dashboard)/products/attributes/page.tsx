"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import {
  Plus,
  Tags,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Filter,
  Check,
} from "lucide-react";

interface Attribute {
  id: string;
  name: string;
  label: string;
  valueType: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "SELECT" | "MULTI_SELECT" | "JSON";
  isRequired: boolean;
  isFilterable: boolean;
  options: string[] | null;
  _count?: {
    values: number;
  };
}

const VALUE_TYPES = {
  TEXT: { label: "Text", description: "Single line text input" },
  NUMBER: { label: "Number", description: "Numeric value" },
  BOOLEAN: { label: "Yes/No", description: "Checkbox toggle" },
  DATE: { label: "Date", description: "Date picker" },
  SELECT: { label: "Single Select", description: "Dropdown with one choice" },
  MULTI_SELECT: { label: "Multi Select", description: "Multiple choices allowed" },
  JSON: { label: "JSON", description: "Structured data" },
};

export default function ProductAttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    valueType: "TEXT" as Attribute["valueType"],
    isRequired: false,
    isFilterable: true,
    options: [] as string[],
  });
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      const res = await fetch("/api/pim/attributes");
      const data = await res.json();
      if (data.success) setAttributes(data.data);
    } catch (error) {
      console.error("Failed to fetch attributes:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateName = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");
  };

  const handleOpenForm = (attribute?: Attribute) => {
    if (attribute) {
      setEditingAttribute(attribute);
      setFormData({
        name: attribute.name,
        label: attribute.label,
        valueType: attribute.valueType,
        isRequired: attribute.isRequired,
        isFilterable: attribute.isFilterable,
        options: attribute.options || [],
      });
    } else {
      setEditingAttribute(null);
      setFormData({
        name: "",
        label: "",
        valueType: "TEXT",
        isRequired: false,
        isFilterable: true,
        options: [],
      });
    }
    setNewOption("");
    setIsFormOpen(true);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()],
      });
      setNewOption("");
    }
  };

  const handleRemoveOption = (option: string) => {
    setFormData({
      ...formData,
      options: formData.options.filter((o) => o !== option),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAttribute
        ? `/api/pim/attributes/${editingAttribute.id}`
        : "/api/pim/attributes";
      const method = editingAttribute ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        name: formData.name || generateName(formData.label),
        label: formData.label,
        valueType: formData.valueType,
        isRequired: formData.isRequired,
        isFilterable: formData.isFilterable,
      };

      if (["SELECT", "MULTI_SELECT"].includes(formData.valueType)) {
        body.options = formData.options;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchAttributes();
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error("Failed to save attribute:", error);
    }
  };

  const handleDelete = async (attribute: Attribute) => {
    if (
      !window.confirm(
        `Delete "${attribute.label}"? This will remove all values from products.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/pim/attributes/${attribute.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAttributes();
      }
    } catch (error) {
      console.error("Failed to delete attribute:", error);
    }
  };

  const showOptionsField = ["SELECT", "MULTI_SELECT"].includes(formData.valueType);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Product Attributes"
          subtitle={`${attributes.length} custom attributes defined`}
          actions={
            <Button onClick={() => handleOpenForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Attribute
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
              Loading...
            </div>
          ) : attributes.length > 0 ? (
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attribute</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attributes.map((attribute) => (
                    <TableRow key={attribute.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{attribute.label}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {attribute.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {VALUE_TYPES[attribute.valueType].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attribute.options && attribute.options.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {attribute.options.slice(0, 3).map((opt) => (
                              <Badge key={opt} variant="outline" className="text-xs">
                                {opt}
                              </Badge>
                            ))}
                            {attribute.options.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{attribute.options.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {attribute.isRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {attribute.isFilterable && (
                            <Badge variant="secondary" className="text-xs">
                              <Filter className="h-3 w-3 mr-1" />
                              Filterable
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {attribute._count?.values || 0} products
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenForm(attribute)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(attribute)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <EmptyState
                icon={<Tags className="h-12 w-12" />}
                title="No attributes defined"
                description="Create custom attributes to capture additional product information like size, color, material, etc."
                action={{ label: "Add Attribute", onClick: () => handleOpenForm() }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Attribute Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAttribute ? "Edit Attribute" : "Add Attribute"}
            </DialogTitle>
            <DialogDescription>
              Define a custom field that can be added to products.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    label: e.target.value,
                    name: formData.name || generateName(e.target.value),
                  });
                }}
                placeholder="e.g., Color, Size, Material"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Internal Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., color, size, material"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Used in API and exports. Auto-generated if left empty.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valueType">Value Type</Label>
              <Select
                value={formData.valueType}
                onValueChange={(val) =>
                  setFormData({ ...formData, valueType: val as Attribute["valueType"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VALUE_TYPES).map(([key, { label, description }]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <div>{label}</div>
                        <div className="text-xs text-muted-foreground">{description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options for SELECT/MULTI_SELECT */}
            {showOptionsField && (
              <div className="space-y-2">
                <Label>Options *</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.options.map((option) => (
                    <Badge key={option} variant="secondary" className="gap-1">
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(option)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add option"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddOption}>
                    Add
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="isRequired">Required</Label>
                <p className="text-xs text-muted-foreground">
                  Products must have this attribute
                </p>
              </div>
              <Switch
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isRequired: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="isFilterable">Filterable</Label>
                <p className="text-xs text-muted-foreground">
                  Can be used to filter products
                </p>
              </div>
              <Switch
                id="isFilterable"
                checked={formData.isFilterable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isFilterable: checked })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  showOptionsField && formData.options.length === 0
                }
              >
                {editingAttribute ? "Update" : "Create"} Attribute
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
