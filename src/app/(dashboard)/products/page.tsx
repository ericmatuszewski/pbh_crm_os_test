"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { HelpTooltip } from "@/components/accessible/Tooltip";
import { Plus, Package, Search, MoreVertical, Edit, Trash2, Eye, Folder, Tags, BookOpen } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  type: "PRODUCT" | "SERVICE" | "SUBSCRIPTION";
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  basePrice: number;
  currency: string;
  pricingType: "ONE_TIME" | "RECURRING_MONTHLY" | "RECURRING_YEARLY" | "USAGE_BASED";
  category: string | null;
  tags: string[];
  trackInventory: boolean;
  stockQuantity: number | null;
  createdAt: string;
}

const productTypes = {
  PRODUCT: { label: "Product", color: "bg-blue-100 text-blue-800" },
  SERVICE: { label: "Service", color: "bg-green-100 text-green-800" },
  SUBSCRIPTION: { label: "Subscription", color: "bg-purple-100 text-purple-800" },
};

const productStatuses = {
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-800" },
  INACTIVE: { label: "Inactive", color: "bg-gray-100 text-gray-800" },
  DISCONTINUED: { label: "Discontinued", color: "bg-red-100 text-red-800" },
};

const pricingTypes = {
  ONE_TIME: "One-time",
  RECURRING_MONTHLY: "Monthly",
  RECURRING_YEARLY: "Yearly",
  USAGE_BASED: "Usage-based",
};

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    type: "PRODUCT" as "PRODUCT" | "SERVICE" | "SUBSCRIPTION",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "DISCONTINUED",
    basePrice: "",
    currency: "USD",
    pricingType: "ONE_TIME" as "ONE_TIME" | "RECURRING_MONTHLY" | "RECURRING_YEARLY" | "USAGE_BASED",
    category: "",
    trackInventory: false,
    stockQuantity: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !search ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      !typeFilter || typeFilter === "all" || product.type === typeFilter;

    const matchesStatus =
      !statusFilter || statusFilter === "all" || product.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleOpenForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || "",
        type: product.type,
        status: product.status,
        basePrice: product.basePrice.toString(),
        currency: product.currency,
        pricingType: product.pricingType,
        category: product.category || "",
        trackInventory: product.trackInventory,
        stockQuantity: product.stockQuantity?.toString() || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: "",
        name: "",
        description: "",
        type: "PRODUCT",
        status: "ACTIVE",
        basePrice: "",
        currency: "USD",
        pricingType: "ONE_TIME",
        category: "",
        trackInventory: false,
        stockQuantity: "",
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: formData.sku,
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          status: formData.status,
          basePrice: parseFloat(formData.basePrice),
          currency: formData.currency,
          pricingType: formData.pricingType,
          category: formData.category || null,
          trackInventory: formData.trackInventory,
          stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : null,
        }),
      });

      if (res.ok) {
        fetchProducts();
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error("Failed to save product:", error);
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Products"
          subtitle={`${products.length} products in catalog`}
          actions={
            <Button onClick={() => handleOpenForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* PIM Navigation */}
            <div className="flex gap-2">
              <Button variant="default" size="sm" asChild>
                <Link href="/products">
                  <Package className="h-4 w-4 mr-1" />
                  Products
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/products/categories">
                  <Folder className="h-4 w-4 mr-1" />
                  Categories
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/products/attributes">
                  <Tags className="h-4 w-4 mr-1" />
                  Attributes
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/products/price-books">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Price Books
                </Link>
              </Button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border p-4">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter || "all"} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="PRODUCT">Product</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                    <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Table */}
            {loading ? (
              <div className="bg-white rounded-lg border p-8">
                <LoadingState message="Loading products..." />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        <TableCell className="font-mono text-sm">
                          {product.sku}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={productTypes[product.type].color} variant="secondary">
                            {productTypes[product.type].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(product.basePrice, product.currency)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pricingTypes[product.pricingType]}
                        </TableCell>
                        <TableCell>
                          <Badge className={productStatuses[product.status].color} variant="secondary">
                            {productStatuses[product.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/products/${product.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenForm(product)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Quick Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteClick(product)}
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
                  icon={<Package className="h-12 w-12" />}
                  title="No products found"
                  description={
                    search || typeFilter || statusFilter
                      ? "Try adjusting your filters to find what you're looking for."
                      : "Get started by adding your first product."
                  }
                  action={
                    !search && !typeFilter && !statusFilter
                      ? { label: "Add Product", onClick: () => handleOpenForm() }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Product Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="sku">SKU *</Label>
                  <HelpTooltip
                    content="Stock Keeping Unit - a unique identifier like PRD-001 or SOFT-2024-001"
                    iconSize="sm"
                  />
                </div>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="PRD-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="type">Type</Label>
                  <HelpTooltip
                    content="Product is physical goods, Service is professional work, Subscription has recurring billing"
                    iconSize="sm"
                  />
                </div>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as typeof formData.type })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCT">Product</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                    <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="pricingType">Pricing Type</Label>
                  <HelpTooltip
                    content="One-time is single purchase, Monthly/Yearly is recurring subscription, Usage-based charges per use"
                    iconSize="sm"
                  />
                </div>
                <Select
                  value={formData.pricingType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, pricingType: value as typeof formData.pricingType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_TIME">One-time</SelectItem>
                    <SelectItem value="RECURRING_MONTHLY">Monthly</SelectItem>
                    <SelectItem value="RECURRING_YEARLY">Yearly</SelectItem>
                    <SelectItem value="USAGE_BASED">Usage-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as typeof formData.status })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Software, Hardware, Consulting"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingProduct ? "Update" : "Create"} Product
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{productToDelete?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
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
