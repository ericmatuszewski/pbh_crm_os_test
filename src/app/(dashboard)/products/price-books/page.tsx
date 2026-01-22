"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, BookOpen, Percent, Tag } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PriceBook, PriceBookEntry, Product, CompanySize } from "@/types";

const companySizeLabels: Record<CompanySize, string> = {
  STARTUP: "Startup",
  SMALL: "Small Business",
  MEDIUM: "Medium Enterprise",
  ENTERPRISE: "Enterprise",
};

export default function PriceBooksPage() {
  const { toast } = useToast();
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [selectedPriceBook, setSelectedPriceBook] = useState<PriceBook | null>(null);
  const [entries, setEntries] = useState<PriceBookEntry[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isDefault: false,
    isActive: true,
    companySize: "",
    industry: "",
    discountPercent: "",
  });
  const [entryFormData, setEntryFormData] = useState({
    productId: "",
    price: "",
    minQuantity: "1",
    maxQuantity: "",
    discountPercent: "",
    isActive: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const fetchPriceBooks = useCallback(async () => {
    try {
      const response = await fetch("/api/price-books");
      const result = await response.json();
      if (result.success) {
        setPriceBooks(result.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch price books",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPriceBooks();
    fetchProducts();
  }, [fetchPriceBooks]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?status=ACTIVE");
      const result = await response.json();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchEntries = async (priceBookId: string) => {
    try {
      const response = await fetch(`/api/price-books/${priceBookId}`);
      const result = await response.json();
      if (result.success) {
        setEntries(result.data.entries || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch price book entries",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (priceBook?: PriceBook) => {
    if (priceBook) {
      setEditingId(priceBook.id);
      setFormData({
        name: priceBook.name,
        description: priceBook.description || "",
        isDefault: priceBook.isDefault,
        isActive: priceBook.isActive,
        companySize: priceBook.companySize || "",
        industry: priceBook.industry || "",
        discountPercent: priceBook.discountPercent?.toString() || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        isDefault: false,
        isActive: true,
        companySize: "",
        industry: "",
        discountPercent: "",
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
      companySize: formData.companySize || null,
      industry: formData.industry || null,
      discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
    };

    try {
      const url = editingId ? `/api/price-books/${editingId}` : "/api/price-books";
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
          description: `Price book ${editingId ? "updated" : "created"} successfully`,
        });
        setIsDialogOpen(false);
        fetchPriceBooks();
      } else {
        throw new Error(result.error?.message || "Failed to save price book");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save price book",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this price book?")) return;

    try {
      const response = await fetch(`/api/price-books/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Price book deleted successfully",
        });
        fetchPriceBooks();
        if (selectedPriceBook?.id === id) {
          setSelectedPriceBook(null);
        }
      } else {
        throw new Error(result.error?.message || "Failed to delete price book");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete price book",
        variant: "destructive",
      });
    }
  };

  const handleSelectPriceBook = (priceBook: PriceBook) => {
    setSelectedPriceBook(priceBook);
    fetchEntries(priceBook.id);
  };

  const handleOpenEntryDialog = (entry?: PriceBookEntry) => {
    if (entry) {
      setEditingEntryId(entry.id);
      setEntryFormData({
        productId: entry.productId,
        price: entry.price.toString(),
        minQuantity: entry.minQuantity.toString(),
        maxQuantity: entry.maxQuantity?.toString() || "",
        discountPercent: entry.discountPercent?.toString() || "",
        isActive: entry.isActive,
      });
    } else {
      setEditingEntryId(null);
      setEntryFormData({
        productId: "",
        price: "",
        minQuantity: "1",
        maxQuantity: "",
        discountPercent: "",
        isActive: true,
      });
    }
    setIsEntryDialogOpen(true);
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPriceBook) return;

    const payload = {
      productId: entryFormData.productId,
      price: parseFloat(entryFormData.price),
      minQuantity: parseInt(entryFormData.minQuantity) || 1,
      maxQuantity: entryFormData.maxQuantity ? parseInt(entryFormData.maxQuantity) : null,
      discountPercent: entryFormData.discountPercent ? parseFloat(entryFormData.discountPercent) : null,
      isActive: entryFormData.isActive,
    };

    try {
      const url = editingEntryId
        ? `/api/price-books/${selectedPriceBook.id}/entries/${editingEntryId}`
        : `/api/price-books/${selectedPriceBook.id}/entries`;
      const method = editingEntryId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Price entry ${editingEntryId ? "updated" : "added"} successfully`,
        });
        setIsEntryDialogOpen(false);
        fetchEntries(selectedPriceBook.id);
      } else {
        throw new Error(result.error?.message || "Failed to save price entry");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save price entry",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!selectedPriceBook) return;
    if (!confirm("Are you sure you want to delete this price entry?")) return;

    try {
      const response = await fetch(`/api/price-books/${selectedPriceBook.id}/entries/${entryId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Price entry deleted successfully",
        });
        fetchEntries(selectedPriceBook.id);
      } else {
        throw new Error(result.error?.message || "Failed to delete price entry");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete price entry",
        variant: "destructive",
      });
    }
  };

  const filteredPriceBooks = priceBooks.filter((pb) =>
    pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableProducts = products.filter(
    (p) => !entries.some((e) => e.productId === p.id && e.id !== editingEntryId)
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
          <h1 className="text-3xl font-bold">Price Books</h1>
          <p className="text-muted-foreground">
            Manage different pricing tiers for customer segments
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Price Book
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Price Books List */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Price Books</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search price books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredPriceBooks.map((priceBook) => (
                <div
                  key={priceBook.id}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedPriceBook?.id === priceBook.id ? "bg-muted" : ""
                  }`}
                  onClick={() => handleSelectPriceBook(priceBook)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{priceBook.name}</span>
                      </div>
                      {priceBook.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {priceBook.description}
                        </p>
                      )}
                      <div className="flex gap-2">
                        {priceBook.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                        {priceBook.companySize && (
                          <Badge variant="outline" className="text-xs">
                            {companySizeLabels[priceBook.companySize]}
                          </Badge>
                        )}
                        {!priceBook.isActive && (
                          <Badge variant="destructive" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(priceBook);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(priceBook.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPriceBooks.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No price books found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Price Book Details & Entries */}
        <Card className="md:col-span-2">
          {selectedPriceBook ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedPriceBook.name}</CardTitle>
                    <CardDescription>
                      {selectedPriceBook.description || "No description"}
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenEntryDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product Price
                  </Button>
                </div>
                <div className="flex gap-4 text-sm">
                  {selectedPriceBook.discountPercent && (
                    <div className="flex items-center gap-1">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedPriceBook.discountPercent}% default discount</span>
                    </div>
                  )}
                  {selectedPriceBook.industry && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedPriceBook.industry}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Min Qty</TableHead>
                      <TableHead className="text-right">Max Qty</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.product?.name || "Unknown Product"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.product?.sku}
                        </TableCell>
                        <TableCell className="text-right">
                          ${entry.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">{entry.minQuantity}</TableCell>
                        <TableCell className="text-right">
                          {entry.maxQuantity || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.discountPercent ? `${entry.discountPercent}%` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.isActive ? "default" : "secondary"}>
                            {entry.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEntryDialog(entry)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No product prices configured. Add products to this price book.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-4" />
              <p>Select a price book to view and manage its entries</p>
            </div>
          )}
        </Card>
      </div>

      {/* Price Book Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Price Book" : "Create Price Book"}
            </DialogTitle>
            <DialogDescription>
              Define pricing rules for customer segments
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select
                    value={formData.companySize}
                    onValueChange={(value) => setFormData({ ...formData, companySize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Any size</SelectItem>
                      {Object.entries(companySizeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountPercent">Default Discount %</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g., Healthcare, Finance"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Default Price Book</Label>
                  <p className="text-sm text-muted-foreground">
                    Use as default for new quotes
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
                    Available for selection
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Price Entry Dialog */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEntryId ? "Edit Product Price" : "Add Product Price"}
            </DialogTitle>
            <DialogDescription>
              Set pricing for a product in this price book
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEntry}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="productId">Product *</Label>
                <Select
                  value={entryFormData.productId}
                  onValueChange={(value) => {
                    const product = products.find((p) => p.id === value);
                    setEntryFormData({
                      ...entryFormData,
                      productId: value,
                      price: product ? product.basePrice.toString() : entryFormData.price,
                    });
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryFormData.price}
                  onChange={(e) => setEntryFormData({ ...entryFormData, price: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minQuantity">Min Quantity</Label>
                  <Input
                    id="minQuantity"
                    type="number"
                    min="1"
                    value={entryFormData.minQuantity}
                    onChange={(e) => setEntryFormData({ ...entryFormData, minQuantity: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxQuantity">Max Quantity</Label>
                  <Input
                    id="maxQuantity"
                    type="number"
                    min="1"
                    value={entryFormData.maxQuantity}
                    onChange={(e) => setEntryFormData({ ...entryFormData, maxQuantity: e.target.value })}
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entryDiscountPercent">Discount %</Label>
                <Input
                  id="entryDiscountPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={entryFormData.discountPercent}
                  onChange={(e) => setEntryFormData({ ...entryFormData, discountPercent: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Available for quotes
                  </p>
                </div>
                <Switch
                  checked={entryFormData.isActive}
                  onCheckedChange={(checked) => setEntryFormData({ ...entryFormData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEntryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingEntryId ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
