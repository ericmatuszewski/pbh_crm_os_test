"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  Settings2,
  Users,
  Building2,
  Target,
  FileText,
  CheckSquare,
  GripVertical,
} from "lucide-react";
import { CustomFieldDefinition, CustomFieldType, CustomFieldOption } from "@/types";

const ENTITIES = [
  { value: "contacts", label: "Contacts", icon: Users },
  { value: "companies", label: "Companies", icon: Building2 },
  { value: "deals", label: "Deals", icon: Target },
  { value: "quotes", label: "Quotes", icon: FileText },
  { value: "tasks", label: "Tasks", icon: CheckSquare },
];

const FIELD_TYPES: { value: CustomFieldType; label: string; description: string }[] = [
  { value: "TEXT", label: "Text", description: "Single line text" },
  { value: "TEXTAREA", label: "Text Area", description: "Multi-line text" },
  { value: "NUMBER", label: "Number", description: "Integer number" },
  { value: "DECIMAL", label: "Decimal", description: "Decimal number" },
  { value: "CURRENCY", label: "Currency", description: "Currency amount" },
  { value: "DATE", label: "Date", description: "Date only" },
  { value: "DATETIME", label: "Date & Time", description: "Date and time" },
  { value: "BOOLEAN", label: "Checkbox", description: "True/False" },
  { value: "DROPDOWN", label: "Dropdown", description: "Single select" },
  { value: "MULTI_SELECT", label: "Multi-Select", description: "Multiple selections" },
  { value: "LOOKUP", label: "Lookup", description: "Reference to another record" },
  { value: "URL", label: "URL", description: "Web address" },
  { value: "EMAIL", label: "Email", description: "Email address" },
  { value: "PHONE", label: "Phone", description: "Phone number" },
  { value: "FORMULA", label: "Formula", description: "Computed field" },
];

export default function CustomFieldsPage() {
  const [selectedEntity, setSelectedEntity] = useState("contacts");
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    description: "",
    fieldType: "TEXT" as CustomFieldType,
    isRequired: false,
    isUnique: false,
    isSearchable: true,
    isFilterable: true,
    showInList: false,
    options: [] as CustomFieldOption[],
    lookupEntity: "",
    lookupDisplayField: "",
    defaultValue: "",
    groupName: "",
  });

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/custom-fields?entity=${selectedEntity}`);
      const data = await response.json();
      if (data.success) {
        setFields(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch custom fields:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedEntity]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleOpenDialog = (field?: CustomFieldDefinition) => {
    if (field) {
      setEditingField(field);
      setFormData({
        name: field.name,
        label: field.label,
        description: field.description || "",
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        isUnique: field.isUnique,
        isSearchable: field.isSearchable,
        isFilterable: field.isFilterable,
        showInList: field.showInList,
        options: (field.options as CustomFieldOption[]) || [],
        lookupEntity: field.lookupEntity || "",
        lookupDisplayField: field.lookupDisplayField || "",
        defaultValue: field.defaultValue ? String(field.defaultValue) : "",
        groupName: field.groupName || "",
      });
    } else {
      setEditingField(null);
      setFormData({
        name: "",
        label: "",
        description: "",
        fieldType: "TEXT",
        isRequired: false,
        isUnique: false,
        isSearchable: true,
        isFilterable: true,
        showInList: false,
        options: [],
        lookupEntity: "",
        lookupDisplayField: "",
        defaultValue: "",
        groupName: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        ...formData,
        entity: selectedEntity,
        options: formData.options.length > 0 ? formData.options : undefined,
        lookupEntity: formData.lookupEntity || undefined,
        lookupDisplayField: formData.lookupDisplayField || undefined,
        defaultValue: formData.defaultValue || undefined,
        groupName: formData.groupName || undefined,
      };

      const url = editingField
        ? `/api/custom-fields/${editingField.id}`
        : "/api/custom-fields";
      const method = editingField ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setDialogOpen(false);
        fetchFields();
      } else {
        alert(data.error?.message || "Failed to save field");
      }
    } catch (error) {
      console.error("Failed to save field:", error);
      alert("Failed to save field");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (field: CustomFieldDefinition) => {
    if (field.isSystem) {
      alert("Cannot delete system fields");
      return;
    }

    if (!confirm(`Are you sure you want to delete the field "${field.label}"? This will delete all data stored in this field.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-fields/${field.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        fetchFields();
      } else {
        alert(data.error?.message || "Failed to delete field");
      }
    } catch (error) {
      console.error("Failed to delete field:", error);
      alert("Failed to delete field");
    }
  };

  const handleToggleActive = async (field: CustomFieldDefinition) => {
    try {
      const response = await fetch(`/api/custom-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !field.isActive }),
      });

      const data = await response.json();
      if (data.success) {
        fetchFields();
      }
    } catch (error) {
      console.error("Failed to toggle field:", error);
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { value: "", label: "", color: "#6366f1" }],
    });
  };

  const updateOption = (index: number, key: keyof CustomFieldOption, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [key]: value };
    // Auto-generate value from label if value is empty
    if (key === "label" && !newOptions[index].value) {
      newOptions[index].value = value.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    }
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const getFieldTypeLabel = (type: CustomFieldType) => {
    return FIELD_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground">
            Add custom fields to track additional data on your records
          </p>
        </div>
      </div>

      <Tabs value={selectedEntity} onValueChange={setSelectedEntity}>
        <TabsList className="mb-6">
          {ENTITIES.map((entity) => {
            const Icon = entity.icon;
            return (
              <TabsTrigger key={entity.value} value={entity.value} className="gap-2">
                <Icon className="h-4 w-4" />
                {entity.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ENTITIES.map((entity) => (
          <TabsContent key={entity.value} value={entity.value}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <entity.icon className="h-5 w-5" />
                    {entity.label} Custom Fields
                  </CardTitle>
                  <CardDescription>
                    {fields.filter((f) => f.isActive).length} active fields
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading fields...
                  </div>
                ) : fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No custom fields yet. Click &quot;Add Field&quot; to create one.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Show in List</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          </TableCell>
                          <TableCell className="font-medium">
                            {field.label}
                            {field.isSystem && (
                              <Badge variant="secondary" className="ml-2">
                                System
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {field.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getFieldTypeLabel(field.fieldType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {field.isRequired ? (
                              <Badge variant="default">Yes</Badge>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {field.showInList ? (
                              <Badge variant="default">Yes</Badge>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={field.isActive}
                              onCheckedChange={() => handleToggleActive(field)}
                              disabled={field.isSystem}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(field)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(field)}
                                disabled={field.isSystem}
                              >
                                <Trash2 className="h-4 w-4" />
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
        ))}
      </Tabs>

      {/* Field Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {editingField ? "Edit Custom Field" : "Create Custom Field"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  placeholder="e.g., Industry Segment"
                  value={formData.label}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      label: e.target.value,
                      // Auto-generate name from label
                      name: editingField
                        ? formData.name
                        : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Field Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., industry_segment"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!!editingField}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this field..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Field Type *</Label>
              <Select
                value={formData.fieldType}
                onValueChange={(value) =>
                  setFormData({ ...formData, fieldType: value as CustomFieldType })
                }
                disabled={!!editingField}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options for dropdown/multi-select */}
            {(formData.fieldType === "DROPDOWN" || formData.fieldType === "MULTI_SELECT") && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Label"
                        value={option.label}
                        onChange={(e) => updateOption(index, "label", e.target.value)}
                      />
                      <Input
                        placeholder="Value"
                        value={option.value}
                        onChange={(e) => updateOption(index, "value", e.target.value)}
                        className="font-mono"
                      />
                      <Input
                        type="color"
                        value={option.color || "#6366f1"}
                        onChange={(e) => updateOption(index, "color", e.target.value)}
                        className="w-14"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addOption} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {/* Lookup configuration */}
            {formData.fieldType === "LOOKUP" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lookup Entity</Label>
                  <Select
                    value={formData.lookupEntity}
                    onValueChange={(value) =>
                      setFormData({ ...formData, lookupEntity: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITIES.map((entity) => (
                        <SelectItem key={entity.value} value={entity.value}>
                          {entity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Display Field</Label>
                  <Input
                    placeholder="e.g., name"
                    value={formData.lookupDisplayField}
                    onChange={(e) =>
                      setFormData({ ...formData, lookupDisplayField: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Value</Label>
                <Input
                  placeholder="Default value..."
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Field Group</Label>
                <Input
                  placeholder="Group name (optional)"
                  value={formData.groupName}
                  onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Required</Label>
                  <p className="text-xs text-muted-foreground">
                    Field must have a value
                  </p>
                </div>
                <Switch
                  checked={formData.isRequired}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isRequired: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Unique</Label>
                  <p className="text-xs text-muted-foreground">
                    No duplicate values allowed
                  </p>
                </div>
                <Switch
                  checked={formData.isUnique}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isUnique: checked })
                  }
                  disabled={!!editingField}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Searchable</Label>
                  <p className="text-xs text-muted-foreground">
                    Include in search
                  </p>
                </div>
                <Switch
                  checked={formData.isSearchable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isSearchable: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Filterable</Label>
                  <p className="text-xs text-muted-foreground">
                    Use as filter
                  </p>
                </div>
                <Switch
                  checked={formData.isFilterable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFilterable: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Show in List</Label>
                  <p className="text-xs text-muted-foreground">
                    Display in table
                  </p>
                </div>
                <Switch
                  checked={formData.showInList}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, showInList: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.label}>
              {saving ? "Saving..." : editingField ? "Save Changes" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
