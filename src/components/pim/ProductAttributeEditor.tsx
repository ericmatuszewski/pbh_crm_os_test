"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Plus, X, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Attribute {
  id: string;
  name: string;
  label: string;
  valueType: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "SELECT" | "MULTI_SELECT" | "JSON";
  isRequired: boolean;
  isFilterable: boolean;
  options: string[] | null;
}

interface AttributeValue {
  id?: string;
  attributeId: string;
  attribute: Attribute;
  textValue: string | null;
  numberValue: number | null;
  jsonValue: unknown | null;
}

interface ProductAttributeEditorProps {
  productId: string;
  className?: string;
  onSave?: () => void;
}

export function ProductAttributeEditor({
  productId,
  className,
  onSave,
}: ProductAttributeEditorProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [values, setValues] = useState<AttributeValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      const [attrsRes, valuesRes] = await Promise.all([
        fetch("/api/pim/attributes"),
        fetch(`/api/products/${productId}/attributes`),
      ]);

      const attrsData = await attrsRes.json();
      const valuesData = await valuesRes.json();

      if (attrsData.success) {
        setAttributes(attrsData.data);
      }

      if (valuesData.success) {
        // Create a map of existing values
        const existingValues = new Map(
          valuesData.data.map((v: AttributeValue) => [v.attributeId, v])
        );

        // Create values for all attributes (existing + empty for missing)
        const allValues = attrsData.data.map((attr: Attribute) => {
          const existing = existingValues.get(attr.id);
          if (existing) {
            return existing;
          }
          return {
            attributeId: attr.id,
            attribute: attr,
            textValue: null,
            numberValue: null,
            jsonValue: null,
          };
        });

        setValues(allValues);
      }
    } catch (error) {
      console.error("Failed to fetch attribute data:", error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getValue = (value: AttributeValue): unknown => {
    const type = value.attribute.valueType;
    switch (type) {
      case "TEXT":
      case "DATE":
      case "SELECT":
        return value.textValue || "";
      case "NUMBER":
        return value.numberValue ?? "";
      case "BOOLEAN":
        return value.textValue === "true";
      case "MULTI_SELECT":
      case "JSON":
        return value.jsonValue || (type === "MULTI_SELECT" ? [] : {});
      default:
        return value.textValue || "";
    }
  };

  const updateValue = (attributeId: string, newValue: unknown) => {
    setValues((prev) =>
      prev.map((v) => {
        if (v.attributeId !== attributeId) return v;

        const type = v.attribute.valueType;
        let textValue: string | null = null;
        let numberValue: number | null = null;
        let jsonValue: unknown | null = null;

        switch (type) {
          case "TEXT":
          case "DATE":
          case "SELECT":
            textValue = newValue as string;
            break;
          case "NUMBER":
            numberValue = newValue === "" ? null : Number(newValue);
            break;
          case "BOOLEAN":
            textValue = newValue ? "true" : "false";
            break;
          case "MULTI_SELECT":
          case "JSON":
            jsonValue = newValue;
            break;
        }

        return { ...v, textValue, numberValue, jsonValue };
      })
    );
    setHasChanges(true);

    // Clear error for this field
    if (errors[attributeId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[attributeId];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    values.forEach((v) => {
      if (v.attribute.isRequired) {
        const val = getValue(v);
        const isEmpty =
          val === "" ||
          val === null ||
          val === undefined ||
          (Array.isArray(val) && val.length === 0);

        if (isEmpty) {
          newErrors[v.attributeId] = `${v.attribute.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      // Only send values that have been set
      const valuesToSave = values
        .filter((v) => {
          const val = getValue(v);
          return val !== "" && val !== null && val !== undefined;
        })
        .map((v) => ({
          attributeId: v.attributeId,
          textValue: v.textValue,
          numberValue: v.numberValue,
          jsonValue: v.jsonValue,
        }));

      const res = await fetch(`/api/products/${productId}/attributes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: valuesToSave }),
      });

      if (res.ok) {
        setHasChanges(false);
        onSave?.();
      }
    } catch (error) {
      console.error("Failed to save attributes:", error);
    } finally {
      setSaving(false);
    }
  };

  const renderAttributeInput = (value: AttributeValue) => {
    const attr = value.attribute;
    const currentValue = getValue(value);
    const error = errors[attr.id];

    const inputClass = cn(error && "border-red-500 focus-visible:ring-red-500");

    switch (attr.valueType) {
      case "TEXT":
        return (
          <Input
            value={currentValue as string}
            onChange={(e) => updateValue(attr.id, e.target.value)}
            placeholder={`Enter ${attr.label.toLowerCase()}`}
            className={inputClass}
          />
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={currentValue as string}
            onChange={(e) => updateValue(attr.id, e.target.value)}
            placeholder={`Enter ${attr.label.toLowerCase()}`}
            className={inputClass}
          />
        );

      case "BOOLEAN":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`attr-${attr.id}`}
              checked={currentValue as boolean}
              onCheckedChange={(checked) => updateValue(attr.id, checked)}
            />
            <Label htmlFor={`attr-${attr.id}`} className="font-normal">
              Yes
            </Label>
          </div>
        );

      case "DATE":
        return (
          <Input
            type="date"
            value={currentValue as string}
            onChange={(e) => updateValue(attr.id, e.target.value)}
            className={inputClass}
          />
        );

      case "SELECT":
        return (
          <Select
            value={currentValue as string}
            onValueChange={(val) => updateValue(attr.id, val)}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder={`Select ${attr.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {attr.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "MULTI_SELECT":
        const selectedValues = (currentValue as string[]) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {selectedValues.map((val) => (
                <Badge key={val} variant="secondary" className="gap-1">
                  {val}
                  <button
                    type="button"
                    onClick={() =>
                      updateValue(
                        attr.id,
                        selectedValues.filter((v) => v !== val)
                      )
                    }
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(val) =>
                updateValue(attr.id, [...selectedValues, val])
              }
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder={`Add ${attr.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {attr.options
                  ?.filter((opt) => !selectedValues.includes(opt))
                  .map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "JSON":
        return (
          <Textarea
            value={JSON.stringify(currentValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateValue(attr.id, parsed);
              } catch {
                // Allow invalid JSON while typing
              }
            }}
            placeholder="Enter JSON value"
            rows={4}
            className={cn("font-mono text-sm", inputClass)}
          />
        );

      default:
        return (
          <Input
            value={currentValue as string}
            onChange={(e) => updateValue(attr.id, e.target.value)}
            className={inputClass}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className={cn("p-4 text-center text-sm text-slate-500", className)}>
        Loading attributes...
      </div>
    );
  }

  if (attributes.length === 0) {
    return (
      <div className={cn("p-4 text-center text-sm text-slate-500", className)}>
        No attributes defined.{" "}
        <a href="/products/attributes" className="text-blue-600 hover:underline">
          Create attributes
        </a>{" "}
        to add custom fields to products.
      </div>
    );
  }

  // Group attributes by required/optional
  const requiredAttrs = values.filter((v) => v.attribute.isRequired);
  const optionalAttrs = values.filter((v) => !v.attribute.isRequired);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Required Attributes */}
      {requiredAttrs.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Required Attributes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requiredAttrs.map((value) => (
              <div key={value.attributeId} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`attr-${value.attributeId}`}>
                    {value.attribute.label}
                  </Label>
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">
                    Required
                  </Badge>
                </div>
                {renderAttributeInput(value)}
                {errors[value.attributeId] && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors[value.attributeId]}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Optional Attributes */}
      {optionalAttrs.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Additional Attributes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {optionalAttrs.map((value) => (
              <div key={value.attributeId} className="space-y-1.5">
                <Label htmlFor={`attr-${value.attributeId}`}>
                  {value.attribute.label}
                </Label>
                {renderAttributeInput(value)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? (
            <>Saving...</>
          ) : hasChanges ? (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Attributes
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default ProductAttributeEditor;
