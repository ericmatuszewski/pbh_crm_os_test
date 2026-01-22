"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Package, Search } from "lucide-react";
import { Product } from "@/types";

export interface QuoteItemInput {
  id?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
  productSku?: string;
  discount?: number;
}

interface QuoteItemsTableProps {
  items: QuoteItemInput[];
  onChange: (items: QuoteItemInput[]) => void;
  currency?: string;
  products?: Product[];
}

export function QuoteItemsTable({
  items,
  onChange,
  currency = "USD",
  products = [],
}: QuoteItemsTableProps) {
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const addItem = () => {
    onChange([
      ...items,
      { name: "", description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const addProductItem = (product: Product) => {
    if (selectedItemIndex !== null) {
      // Replace existing item
      const newItems = [...items];
      newItems[selectedItemIndex] = {
        ...newItems[selectedItemIndex],
        name: product.name,
        description: product.description || "",
        unitPrice: product.basePrice,
        productId: product.id,
        productSku: product.sku,
      };
      onChange(newItems);
    } else {
      // Add new item
      onChange([
        ...items,
        {
          name: product.name,
          description: product.description || "",
          quantity: 1,
          unitPrice: product.basePrice,
          productId: product.id,
          productSku: product.sku,
        },
      ]);
    }
    setIsProductDialogOpen(false);
    setSelectedItemIndex(null);
    setProductSearchQuery("");
  };

  const updateItem = (index: number, field: keyof QuoteItemInput, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const openProductSelector = (index?: number) => {
    setSelectedItemIndex(index !== undefined ? index : null);
    setIsProductDialogOpen(true);
  };

  const calculateItemTotal = (item: QuoteItemInput): number => {
    const baseTotal = item.quantity * item.unitPrice;
    if (item.discount && item.discount > 0) {
      return baseTotal * (1 - item.discount / 100);
    }
    return baseTotal;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  const filteredProducts = products.filter(
    (p) =>
      p.status === "ACTIVE" &&
      (p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(productSearchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8"></th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                Item
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-[180px]">
                Description
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 w-[80px]">
                Qty
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 w-[120px]">
                Unit Price
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 w-[80px]">
                Disc %
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 w-[120px]">
                Total
              </th>
              <th className="w-[50px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={index} className="bg-white">
                <td className="px-2 py-3 text-gray-400">
                  <GripVertical className="h-4 w-4 cursor-grab" />
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      placeholder="Item name"
                      className="w-full"
                    />
                    {item.productSku && (
                      <span className="text-xs text-muted-foreground">
                        SKU: {item.productSku}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="Description"
                    className="w-full"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    className="w-full text-right"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-full text-right"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={item.discount || ""}
                    onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-right"
                  />
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(calculateItemTotal(item))}
                </td>
                <td className="px-2 py-3">
                  <div className="flex gap-1">
                    {products.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openProductSelector(index)}
                        className="h-8 w-8 text-gray-400 hover:text-primary"
                        title="Select from products"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={5}></td>
              <td className="px-4 py-3 text-right font-medium text-gray-500">
                Subtotal
              </td>
              <td className="px-4 py-3 text-right font-bold">
                {formatCurrency(subtotal)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={addItem} className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          Add Line Item
        </Button>
        {products.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => openProductSelector()}
            className="flex-1"
          >
            <Package className="h-4 w-4 mr-2" />
            Add from Products
          </Button>
        )}
      </div>

      {/* Product Selection Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, SKU, or category..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y border rounded-lg">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => addProductItem(product)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {product.sku}
                          {product.category && ` | ${product.category}`}
                        </div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {product.description}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(product.basePrice)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {product.pricingType.replace(/_/g, " ").toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {productSearchQuery
                    ? "No products match your search"
                    : "No active products available"}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
