"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ProductAttributeEditor,
  ProductMediaGallery,
  ProductVariantBuilder,
  ProductCategoryTree,
} from "@/components/pim";
import {
  ArrowLeft,
  Save,
  Package,
  Tags,
  Image as ImageIcon,
  Layers,
  Folder,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  path: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  type: "PRODUCT" | "SERVICE" | "SUBSCRIPTION";
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  lifecycleStage: string;
  basePrice: number;
  currency: string;
  pricingType: string;
  categoryId: string | null;
  category: Category | null;
  trackInventory: boolean;
  stockQuantity: number | null;
  isVariant: boolean;
  parentId: string | null;
  externalId: string | null;
  externalSource: string | null;
  _count?: {
    children: number;
    media: number;
  };
}

const productTypes = {
  PRODUCT: "Product",
  SERVICE: "Service",
  SUBSCRIPTION: "Subscription",
};

const productStatuses = {
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-800" },
  INACTIVE: { label: "Inactive", color: "bg-gray-100 text-gray-800" },
  DISCONTINUED: { label: "Discontinued", color: "bg-red-100 text-red-800" },
};

const lifecycleStages = {
  CONCEPT: "Concept",
  DEVELOPMENT: "Development",
  PRE_LAUNCH: "Pre-Launch",
  ACTIVE: "Active",
  END_OF_LIFE: "End of Life",
  DISCONTINUED: "Discontinued",
  ARCHIVED: "Archived",
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    type: "PRODUCT" as Product["type"],
    status: "ACTIVE" as Product["status"],
    lifecycleStage: "ACTIVE",
    basePrice: "",
    currency: "USD",
    pricingType: "ONE_TIME",
    categoryId: null as string | null,
    trackInventory: false,
    stockQuantity: "",
  });

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (data.success) {
        const p = data.data;
        setProduct(p);
        setFormData({
          sku: p.sku,
          name: p.name,
          description: p.description || "",
          type: p.type,
          status: p.status,
          lifecycleStage: p.lifecycleStage || "ACTIVE",
          basePrice: p.basePrice.toString(),
          currency: p.currency,
          pricingType: p.pricingType,
          categoryId: p.categoryId,
          trackInventory: p.trackInventory,
          stockQuantity: p.stockQuantity?.toString() || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: formData.sku,
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          status: formData.status,
          lifecycleStage: formData.lifecycleStage,
          basePrice: parseFloat(formData.basePrice),
          currency: formData.currency,
          pricingType: formData.pricingType,
          categoryId: formData.categoryId,
          trackInventory: formData.trackInventory,
          stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : null,
        }),
      });

      if (res.ok) {
        setHasChanges(false);
        await fetchProduct();
      }
    } catch (error) {
      console.error("Failed to save product:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySelect = (category: Category | null) => {
    handleInputChange("categoryId", category?.id || null);
    setIsCategoryDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading product...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
          <Button variant="outline" onClick={() => router.push("/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={product.name}
          subtitle={`SKU: ${product.sku}`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/products")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge className={productStatuses[product.status].color}>
              {productStatuses[product.status].label}
            </Badge>
            {product.isVariant && (
              <Badge variant="outline">Variant</Badge>
            )}
            {product.category && (
              <Badge variant="secondary">{product.category.name}</Badge>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="details" className="gap-2">
                <Package className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="attributes" className="gap-2">
                <Tags className="h-4 w-4" />
                Attributes
              </TabsTrigger>
              <TabsTrigger value="media" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                Media
                {product._count?.media ? (
                  <Badge variant="secondary" className="ml-1">
                    {product._count.media}
                  </Badge>
                ) : null}
              </TabsTrigger>
              {!product.isVariant && (
                <TabsTrigger value="variants" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Variants
                  {product._count?.children ? (
                    <Badge variant="secondary" className="ml-1">
                      {product._count.children}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              )}
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Basic Info */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU *</Label>
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => handleInputChange("sku", e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(val) => handleInputChange("type", val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(productTypes).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <div className="flex items-center gap-2">
                        {product.category ? (
                          <Badge variant="secondary" className="gap-1">
                            <Folder className="h-3 w-3" />
                            {product.category.path.split("/").join(" > ")}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">No category</span>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCategoryDialogOpen(true)}
                        >
                          {product.category ? "Change" : "Select"}
                        </Button>
                        {product.category && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCategorySelect(null)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing & Status */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Pricing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="basePrice">Base Price *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="basePrice"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.basePrice}
                            onChange={(e) => handleInputChange("basePrice", e.target.value)}
                            className="flex-1"
                          />
                          <Select
                            value={formData.currency}
                            onValueChange={(val) => handleInputChange("currency", val)}
                          >
                            <SelectTrigger className="w-24">
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

                      <div className="space-y-2">
                        <Label htmlFor="pricingType">Pricing Type</Label>
                        <Select
                          value={formData.pricingType}
                          onValueChange={(val) => handleInputChange("pricingType", val)}
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
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(val) => handleInputChange("status", val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(productStatuses).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lifecycleStage">Lifecycle Stage</Label>
                        <Select
                          value={formData.lifecycleStage}
                          onValueChange={(val) => handleInputChange("lifecycleStage", val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(lifecycleStages).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Attributes Tab */}
            <TabsContent value="attributes">
              <Card>
                <CardHeader>
                  <CardTitle>Product Attributes</CardTitle>
                  <CardDescription>
                    Set custom attribute values for this product
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductAttributeEditor productId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media">
              <Card>
                <CardHeader>
                  <CardTitle>Media Gallery</CardTitle>
                  <CardDescription>
                    Manage product images, videos, and documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductMediaGallery productId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Variants Tab */}
            {!product.isVariant && (
              <TabsContent value="variants">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Variants</CardTitle>
                    <CardDescription>
                      Create variations of this product with different attributes and prices
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductVariantBuilder productId={id} onVariantCreated={fetchProduct} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>

      {/* Category Selection Dialog */}
      {isCategoryDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Select Category</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCategoryDialogOpen(false)}
              >
                Cancel
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[60vh]">
              <ProductCategoryTree
                onSelect={handleCategorySelect}
                selectedId={formData.categoryId}
                showActions={false}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
