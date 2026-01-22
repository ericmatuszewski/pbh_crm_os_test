"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ProductCategoryTree } from "@/components/pim";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, Package, ArrowRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  path: string;
  level: number;
  isActive: boolean;
  _count?: {
    products: number;
    children: number;
  };
}

export default function ProductCategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Product Categories"
          subtitle="Organize products into hierarchical categories"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Tree */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Category Tree</CardTitle>
                  <CardDescription>
                    Click to select, use menu for actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductCategoryTree
                    onSelect={setSelectedCategory}
                    selectedId={selectedCategory?.id}
                    showActions={true}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Category Details */}
            <div className="lg:col-span-2">
              {selectedCategory ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Folder className="h-5 w-5 text-blue-600" />
                          {selectedCategory.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {selectedCategory.description || "No description"}
                        </CardDescription>
                      </div>
                      <Badge variant={selectedCategory.isActive ? "default" : "secondary"}>
                        {selectedCategory.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Path Breadcrumb */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Path</label>
                      <div className="flex items-center gap-1 mt-1 text-sm">
                        {selectedCategory.path.split("/").map((segment, i, arr) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <ArrowRight className="h-3 w-3 text-slate-400" />}
                            <span className={i === arr.length - 1 ? "font-medium" : "text-muted-foreground"}>
                              {segment}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Package className="h-4 w-4" />
                          Products
                        </div>
                        <div className="text-2xl font-semibold">
                          {selectedCategory._count?.products || 0}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Folder className="h-4 w-4" />
                          Subcategories
                        </div>
                        <div className="text-2xl font-semibold">
                          {selectedCategory._count?.children || 0}
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-muted-foreground">Slug</label>
                        <div className="font-mono bg-slate-100 px-2 py-1 rounded mt-1">
                          {selectedCategory.slug}
                        </div>
                      </div>
                      <div>
                        <label className="text-muted-foreground">Level</label>
                        <div className="mt-1">Level {selectedCategory.level}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Folder className="h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium mb-1">Select a Category</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Click on a category in the tree to view its details
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
