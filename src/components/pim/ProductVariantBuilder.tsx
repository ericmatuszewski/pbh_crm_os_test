"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  MoreVertical,
  Edit,
  Copy,
  Wand2,
  Package,
  AlertCircle,
  Check,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface Attribute {
  id: string;
  name: string;
  label: string;
  valueType: string;
  options: string[] | null;
}

interface Variant {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  stockQuantity: number | null;
  attributes: {
    attributeId: string;
    attribute: Attribute;
    textValue: string | null;
  }[];
}

interface Product {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  currency: string;
}

interface ProductVariantBuilderProps {
  productId: string;
  className?: string;
  onVariantCreated?: () => void;
}

interface AttributeSelection {
  attributeId: string;
  attribute: Attribute;
  selectedValues: string[];
}

export function ProductVariantBuilder({
  productId,
  className,
  onVariantCreated,
}: ProductVariantBuilderProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isAddSingleDialogOpen, setIsAddSingleDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk generation state
  const [attributeSelections, setAttributeSelections] = useState<AttributeSelection[]>([]);
  const [priceAdjustments, setPriceAdjustments] = useState<Record<string, number>>({});

  // Single variant form state
  const [singleFormData, setSingleFormData] = useState({
    sku: "",
    name: "",
    basePrice: "",
    attributeValues: {} as Record<string, string>,
  });

  const fetchData = useCallback(async () => {
    try {
      const [productRes, variantsRes, attrsRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch(`/api/products/${productId}/variants`),
        fetch("/api/pim/attributes"),
      ]);

      const productData = await productRes.json();
      const variantsData = await variantsRes.json();
      const attrsData = await attrsRes.json();

      if (productData.success) {
        setProduct(productData.data);
      }

      if (variantsData.success) {
        setVariants(variantsData.data);
      }

      if (attrsData.success) {
        // Only show SELECT/MULTI_SELECT attributes that have options
        const variantAttrs = attrsData.data.filter(
          (a: Attribute) =>
            (a.valueType === "SELECT" || a.valueType === "MULTI_SELECT") &&
            a.options &&
            a.options.length > 0
        );
        setAttributes(variantAttrs);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load variant data", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenGenerateDialog = () => {
    // Initialize attribute selections
    setAttributeSelections(
      attributes.map((attr) => ({
        attributeId: attr.id,
        attribute: attr,
        selectedValues: [],
      }))
    );
    setPriceAdjustments({});
    setError(null);
    setIsGenerateDialogOpen(true);
  };

  const handleAttributeValueToggle = (attrId: string, value: string) => {
    setAttributeSelections((prev) =>
      prev.map((sel) => {
        if (sel.attributeId !== attrId) return sel;
        const hasValue = sel.selectedValues.includes(value);
        return {
          ...sel,
          selectedValues: hasValue
            ? sel.selectedValues.filter((v) => v !== value)
            : [...sel.selectedValues, value],
        };
      })
    );
  };

  const handlePriceAdjustmentChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPriceAdjustments((prev) => ({
      ...prev,
      [key]: numValue,
    }));
  };

  const calculateCombinations = (): number => {
    const selectionsWithValues = attributeSelections.filter(
      (s) => s.selectedValues.length > 0
    );
    if (selectionsWithValues.length === 0) return 0;
    return selectionsWithValues.reduce((acc, sel) => acc * sel.selectedValues.length, 1);
  };

  const handleGenerateVariants = async () => {
    const selectionsWithValues = attributeSelections.filter(
      (s) => s.selectedValues.length > 0
    );

    if (selectionsWithValues.length === 0) {
      setError("Please select at least one attribute value");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}/variants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attributeSelections: selectionsWithValues.map((s) => ({
            attributeId: s.attributeId,
            values: s.selectedValues,
          })),
          priceAdjustments,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchData();
        setIsGenerateDialogOpen(false);
        onVariantCreated?.();
      } else {
        setError(data.error?.message || "Failed to generate variants");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate variants");
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenAddSingle = (variant?: Variant) => {
    if (variant) {
      setEditingVariant(variant);
      const attrValues: Record<string, string> = {};
      variant.attributes.forEach((a) => {
        if (a.textValue) {
          attrValues[a.attributeId] = a.textValue;
        }
      });
      setSingleFormData({
        sku: variant.sku,
        name: variant.name,
        basePrice: variant.basePrice.toString(),
        attributeValues: attrValues,
      });
    } else {
      setEditingVariant(null);
      setSingleFormData({
        sku: product ? `${product.sku}-` : "",
        name: product ? `${product.name} - ` : "",
        basePrice: product?.basePrice.toString() || "",
        attributeValues: {},
      });
    }
    setError(null);
    setIsAddSingleDialogOpen(true);
  };

  const handleSaveSingleVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = editingVariant
        ? `/api/products/${productId}/variants/${editingVariant.id}`
        : `/api/products/${productId}/variants`;
      const method = editingVariant ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: singleFormData.sku,
          name: singleFormData.name,
          basePrice: parseFloat(singleFormData.basePrice),
          attributeValues: singleFormData.attributeValues,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchData();
        setIsAddSingleDialogOpen(false);
        onVariantCreated?.();
      } else {
        setError(data.error?.message || "Failed to save variant");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save variant");
    }
  };

  const handleDeleteVariant = async (variant: Variant) => {
    if (!window.confirm(`Delete variant "${variant.name}"?`)) return;

    try {
      const res = await fetch(`/api/products/${productId}/variants/${variant.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setVariants((prev) => prev.filter((v) => v.id !== variant.id));
      }
    } catch (error) {
      console.error("Failed to delete variant:", error);
      toast.error("Failed to delete variant", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  };

  const getVariantAttributeDisplay = (variant: Variant): string => {
    return variant.attributes
      .filter((a) => a.textValue)
      .map((a) => `${a.attribute.label}: ${a.textValue}`)
      .join(", ");
  };

  if (loading) {
    return (
      <div className={cn("p-4 text-center text-sm text-slate-500", className)}>
        Loading variants...
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {variants.length} variant{variants.length !== 1 ? "s" : ""}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenAddSingle()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Single
          </Button>
          {attributes.length > 0 && (
            <Button size="sm" onClick={handleOpenGenerateDialog}>
              <Wand2 className="h-4 w-4 mr-1" />
              Generate Variants
            </Button>
          )}
        </div>
      </div>

      {/* Variants Table */}
      {variants.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Attributes</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                  <TableCell className="font-medium">{variant.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {variant.attributes
                        .filter((a) => a.textValue)
                        .map((a) => (
                          <Badge key={a.attributeId} variant="secondary" className="text-xs">
                            {a.textValue}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {product && formatCurrency(variant.basePrice, product.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={variant.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {variant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenAddSingle(variant)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteVariant(variant)}
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium mb-1">No Variants</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create variants to offer different options of this product.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenAddSingle()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Single Variant
              </Button>
              {attributes.length > 0 && (
                <Button onClick={handleOpenGenerateDialog}>
                  <Wand2 className="h-4 w-4 mr-1" />
                  Generate from Attributes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Variants Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Variants</DialogTitle>
            <DialogDescription>
              Select attribute values to generate all combinations as variants.
            </DialogDescription>
          </DialogHeader>

          {attributes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No attributes with options available.</p>
              <p className="text-sm">
                Create SELECT or MULTI_SELECT attributes with options to generate variants.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Attribute Selections */}
              {attributeSelections.map((selection) => (
                <div key={selection.attributeId} className="space-y-2">
                  <Label className="font-medium">{selection.attribute.label}</Label>
                  <div className="flex flex-wrap gap-2">
                    {selection.attribute.options?.map((option) => {
                      const isSelected = selection.selectedValues.includes(option);
                      const adjustmentKey = `${selection.attributeId}:${option}`;
                      return (
                        <div key={option} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleAttributeValueToggle(selection.attributeId, option)
                            }
                            className={cn(
                              "px-3 py-1.5 rounded-md border text-sm transition-colors",
                              isSelected
                                ? "bg-blue-50 border-blue-500 text-blue-700"
                                : "hover:border-slate-400"
                            )}
                          >
                            {isSelected && <Check className="inline h-3 w-3 mr-1" />}
                            {option}
                          </button>
                          {isSelected && (
                            <Input
                              type="number"
                              placeholder="+/-"
                              value={priceAdjustments[adjustmentKey] || ""}
                              onChange={(e) =>
                                handlePriceAdjustmentChange(adjustmentKey, e.target.value)
                              }
                              className="w-20 h-8 text-sm"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <Separator />

              {/* Preview */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <strong>{calculateCombinations()}</strong> variant
                  {calculateCombinations() !== 1 ? "s" : ""} will be created
                </div>
                <div className="text-sm text-muted-foreground">
                  Base price: {product && formatCurrency(product.basePrice, product.currency)}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsGenerateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateVariants}
                  disabled={generating || calculateCombinations() === 0}
                >
                  {generating ? "Generating..." : `Generate ${calculateCombinations()} Variants`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Single Variant Dialog */}
      <Dialog open={isAddSingleDialogOpen} onOpenChange={setIsAddSingleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? "Edit Variant" : "Add Variant"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSingleVariant} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="variantSku">SKU *</Label>
              <Input
                id="variantSku"
                value={singleFormData.sku}
                onChange={(e) =>
                  setSingleFormData({ ...singleFormData, sku: e.target.value })
                }
                placeholder="Product SKU"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variantName">Name *</Label>
              <Input
                id="variantName"
                value={singleFormData.name}
                onChange={(e) =>
                  setSingleFormData({ ...singleFormData, name: e.target.value })
                }
                placeholder="Variant name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variantPrice">Price *</Label>
              <Input
                id="variantPrice"
                type="number"
                step="0.01"
                min="0"
                value={singleFormData.basePrice}
                onChange={(e) =>
                  setSingleFormData({ ...singleFormData, basePrice: e.target.value })
                }
                required
              />
            </div>

            {/* Attribute Values */}
            {attributes.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <Label className="text-sm font-medium">Attributes</Label>
                {attributes.map((attr) => (
                  <div key={attr.id} className="space-y-1">
                    <Label htmlFor={`attr-${attr.id}`} className="text-sm">
                      {attr.label}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {attr.options?.map((option) => {
                        const isSelected =
                          singleFormData.attributeValues[attr.id] === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setSingleFormData({
                                ...singleFormData,
                                attributeValues: {
                                  ...singleFormData.attributeValues,
                                  [attr.id]: isSelected ? "" : option,
                                },
                              })
                            }
                            className={cn(
                              "px-3 py-1 rounded border text-sm transition-colors",
                              isSelected
                                ? "bg-blue-50 border-blue-500 text-blue-700"
                                : "hover:border-slate-400"
                            )}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSingleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingVariant ? "Update" : "Create"} Variant
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductVariantBuilder;
