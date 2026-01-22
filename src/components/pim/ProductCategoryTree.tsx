"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  FolderPlus,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  level: number;
  path: string;
  imageUrl: string | null;
  isActive: boolean;
  children?: Category[];
  _count?: {
    products: number;
    children: number;
  };
}

interface ProductCategoryTreeProps {
  onSelect?: (category: Category | null) => void;
  selectedId?: string | null;
  selectionMode?: "single" | "none";
  showActions?: boolean;
  className?: string;
}

export function ProductCategoryTree({
  onSelect,
  selectedId,
  selectionMode = "single",
  showActions = true,
  className,
}: ProductCategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentForNew, setParentForNew] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true,
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/pim/categories?tree=true");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
        // Auto-expand first level
        const firstLevelIds = data.data.map((c: Category) => c.id);
        setExpandedIds(new Set(firstLevelIds));
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (category: Category) => {
    if (selectionMode === "single" && onSelect) {
      onSelect(category);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleOpenForm = (parent?: Category, category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setParentForNew(null);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        isActive: category.isActive,
      });
    } else {
      setEditingCategory(null);
      setParentForNew(parent || null);
      setFormData({
        name: "",
        slug: "",
        description: "",
        isActive: true,
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory
        ? `/api/pim/categories/${editingCategory.id}`
        : "/api/pim/categories";
      const method = editingCategory ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || null,
        isActive: formData.isActive,
      };

      if (!editingCategory && parentForNew) {
        body.parentId = parentForNew.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchCategories();
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  const handleDelete = async (category: Category) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${category.name}"? This will also delete all child categories.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/pim/categories/${category.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCategories();
        if (selectedId === category.id && onSelect) {
          onSelect(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const renderCategory = (category: Category, depth: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const isSelected = selectedId === category.id;

    return (
      <div key={category.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer group hover:bg-slate-100",
            isSelected && "bg-blue-50 hover:bg-blue-100",
            !category.isActive && "opacity-50"
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => handleSelect(category)}
        >
          {/* Expand/collapse button */}
          <button
            className={cn(
              "w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200",
              !hasChildren && "invisible"
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(category.id);
            }}
          >
            {hasChildren &&
              (isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              ))}
          </button>

          {/* Folder icon */}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-600" />
          ) : (
            <Folder className="w-4 h-4 text-slate-500" />
          )}

          {/* Name */}
          <span className="flex-1 text-sm font-medium truncate">{category.name}</span>

          {/* Product count */}
          {category._count?.products !== undefined && category._count.products > 0 && (
            <Badge variant="secondary" className="text-xs">
              {category._count.products}
            </Badge>
          )}

          {/* Inactive badge */}
          {!category.isActive && (
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          )}

          {/* Actions */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenForm(category)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add Subcategory
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenForm(undefined, category)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(category)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("p-4 text-center text-sm text-slate-500", className)}>
        Loading categories...
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      {showActions && (
        <div className="flex items-center justify-between px-2 pb-2 border-b">
          <span className="text-sm font-medium text-slate-700">Categories</span>
          <Button variant="ghost" size="sm" onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}

      {/* Tree */}
      <div className="space-y-0.5">
        {categories.length > 0 ? (
          categories.map((category) => renderCategory(category))
        ) : (
          <div className="p-4 text-center text-sm text-slate-500">
            No categories yet.{" "}
            {showActions && (
              <button
                className="text-blue-600 hover:underline"
                onClick={() => handleOpenForm()}
              >
                Create one
              </button>
            )}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            {parentForNew && (
              <DialogDescription>
                Creating subcategory under <strong>{parentForNew.name}</strong>
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: formData.slug || generateSlug(e.target.value),
                  });
                }}
                placeholder="Category name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="category-slug"
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Auto-generated from name if left empty.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Category description..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive categories are hidden from product selection
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductCategoryTree;
