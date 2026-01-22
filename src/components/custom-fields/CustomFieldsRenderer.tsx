"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CustomFieldDefinition,
  CustomFieldType,
  CustomFieldOption,
  CustomFieldValue,
} from "@/types";

interface CustomFieldWithValue {
  field: CustomFieldDefinition;
  value: unknown;
  rawValue?: CustomFieldValue;
}

interface CustomFieldsRendererProps {
  entityType: string;
  entityId: string;
  readOnly?: boolean;
  compact?: boolean;
  showGroups?: boolean;
  onValueChange?: (fieldId: string, value: unknown) => void;
}

export function CustomFieldsRenderer({
  entityType,
  entityId,
  readOnly = false,
  compact = false,
  showGroups = true,
  onValueChange,
}: CustomFieldsRendererProps) {
  const [fieldsWithValues, setFieldsWithValues] = useState<CustomFieldWithValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const fetchFieldsAndValues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/custom-fields/values?entityType=${entityType}&entityId=${entityId}`
      );
      const data = await response.json();
      if (data.success) {
        setFieldsWithValues(data.data);
        // Initialize local values
        const values: Record<string, unknown> = {};
        data.data.forEach((item: CustomFieldWithValue) => {
          values[item.field.id] = item.value;
        });
        setLocalValues(values);
      }
    } catch (error) {
      console.error("Failed to fetch custom fields:", error);
      toast.error("Failed to load custom fields", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (entityId) {
      fetchFieldsAndValues();
    }
  }, [entityId, fetchFieldsAndValues]);

  const handleValueChange = (fieldId: string, value: unknown) => {
    setLocalValues((prev) => ({ ...prev, [fieldId]: value }));
    setHasChanges(true);
    onValueChange?.(fieldId, value);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const valuesToSave = fieldsWithValues
        .filter((item) => {
          const oldValue = item.value;
          const newValue = localValues[item.field.id];
          return JSON.stringify(oldValue) !== JSON.stringify(newValue);
        })
        .map((item) => ({
          fieldId: item.field.id,
          value: localValues[item.field.id],
        }));

      if (valuesToSave.length === 0) {
        setHasChanges(false);
        return;
      }

      const response = await fetch("/api/custom-fields/values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          values: valuesToSave,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setHasChanges(false);
        fetchFieldsAndValues();
      } else {
        toast.error("Failed to save custom fields", {
          description: data.data?.errors?.[0]?.error || "Please try again"
        });
      }
    } catch (error) {
      console.error("Failed to save custom field values:", error);
      toast.error("Failed to save custom fields", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading custom fields...
      </div>
    );
  }

  if (fieldsWithValues.length === 0) {
    return null;
  }

  // Group fields by groupName
  const groupedFields = new Map<string, CustomFieldWithValue[]>();
  fieldsWithValues.forEach((item) => {
    const groupName = item.field.groupName || "General";
    if (!groupedFields.has(groupName)) {
      groupedFields.set(groupName, []);
    }
    groupedFields.get(groupName)!.push(item);
  });

  const renderField = (item: CustomFieldWithValue) => {
    const { field } = item;
    const value = localValues[field.id];

    if (readOnly) {
      return (
        <div key={field.id} className={cn("space-y-1", compact ? "py-1" : "py-2")}>
          <Label className="text-muted-foreground text-sm">{field.label}</Label>
          <div>{formatDisplayValue(field.fieldType, value, field.options as CustomFieldOption[])}</div>
        </div>
      );
    }

    return (
      <div key={field.id} className={cn("space-y-2", compact ? "py-1" : "py-2")}>
        <Label htmlFor={field.id}>
          {field.label}
          {field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {renderFieldInput(field, value, (newValue) => handleValueChange(field.id, newValue))}
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {showGroups && groupedFields.size > 1 ? (
        Array.from(groupedFields.entries()).map(([groupName, items]) => (
          <Card key={groupName}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
              onClick={() => toggleGroup(groupName)}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <span>{groupName}</span>
                {collapsedGroups.has(groupName) ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
            {!collapsedGroups.has(groupName) && (
              <CardContent className="pt-0">
                <div className={cn("grid gap-4", compact ? "grid-cols-2" : "grid-cols-1")}>
                  {items.map(renderField)}
                </div>
              </CardContent>
            )}
          </Card>
        ))
      ) : (
        <div className={cn("grid gap-4", compact ? "grid-cols-2" : "grid-cols-1")}>
          {fieldsWithValues.map(renderField)}
        </div>
      )}

      {!readOnly && hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Custom Fields
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function renderFieldInput(
  field: CustomFieldDefinition,
  value: unknown,
  onChange: (value: unknown) => void
) {
  const options = field.options as CustomFieldOption[] | null;

  switch (field.fieldType) {
    case "TEXT":
    case "URL":
    case "EMAIL":
    case "PHONE":
      return (
        <Input
          id={field.id}
          type={
            field.fieldType === "EMAIL"
              ? "email"
              : field.fieldType === "URL"
              ? "url"
              : field.fieldType === "PHONE"
              ? "tel"
              : "text"
          }
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      );

    case "TEXTAREA":
      return (
        <Textarea
          id={field.id}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          rows={3}
        />
      );

    case "NUMBER":
      return (
        <Input
          id={field.id}
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        />
      );

    case "DECIMAL":
    case "CURRENCY":
      return (
        <Input
          id={field.id}
          type="number"
          step="0.01"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
        />
      );

    case "DATE":
      return (
        <Input
          id={field.id}
          type="date"
          value={value ? new Date(value as string).toISOString().split("T")[0] : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case "DATETIME":
      return (
        <Input
          id={field.id}
          type="datetime-local"
          value={value ? new Date(value as string).toISOString().slice(0, 16) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case "BOOLEAN":
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={field.id}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <Label htmlFor={field.id} className="cursor-pointer">
            Yes
          </Label>
        </div>
      );

    case "DROPDOWN":
      return (
        <Select
          value={(value as string) || ""}
          onValueChange={(val) => onChange(val || null)}
        >
          <SelectTrigger id={field.id}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "MULTI_SELECT":
      const selectedValues = (value as string[]) || [];
      return (
        <div className="space-y-2">
          {options?.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${field.id}-${option.value}`}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selectedValues, option.value]);
                  } else {
                    onChange(selectedValues.filter((v) => v !== option.value));
                  }
                }}
              />
              <Label htmlFor={`${field.id}-${option.value}`} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  {option.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.label}
                </div>
              </Label>
            </div>
          ))}
        </div>
      );

    default:
      return (
        <Input
          id={field.id}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function formatDisplayValue(
  fieldType: CustomFieldType,
  value: unknown,
  options?: CustomFieldOption[] | null
): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (fieldType) {
    case "BOOLEAN":
      return value ? "Yes" : "No";

    case "DATE":
      return new Date(value as string).toLocaleDateString();

    case "DATETIME":
      return new Date(value as string).toLocaleString();

    case "CURRENCY":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value as number);

    case "URL":
      return (
        <a
          href={value as string}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {value as string}
        </a>
      );

    case "EMAIL":
      return (
        <a href={`mailto:${value}`} className="text-primary hover:underline">
          {value as string}
        </a>
      );

    case "PHONE":
      return (
        <a href={`tel:${value}`} className="text-primary hover:underline">
          {value as string}
        </a>
      );

    case "DROPDOWN":
      const selectedOption = options?.find((o) => o.value === value);
      if (selectedOption) {
        return (
          <Badge
            variant="outline"
            style={{
              backgroundColor: selectedOption.color ? `${selectedOption.color}20` : undefined,
              borderColor: selectedOption.color,
              color: selectedOption.color,
            }}
          >
            {selectedOption.label}
          </Badge>
        );
      }
      return value as string;

    case "MULTI_SELECT":
      const values = value as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => {
            const opt = options?.find((o) => o.value === v);
            return (
              <Badge
                key={v}
                variant="outline"
                style={{
                  backgroundColor: opt?.color ? `${opt.color}20` : undefined,
                  borderColor: opt?.color,
                  color: opt?.color,
                }}
              >
                {opt?.label || v}
              </Badge>
            );
          })}
        </div>
      );

    default:
      return String(value);
  }
}

export default CustomFieldsRenderer;
