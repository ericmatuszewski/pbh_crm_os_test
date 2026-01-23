"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  X,
  Clock,
  Star,
  Building2,
  Users,
  DollarSign,
  FileText,
  CheckSquare,
  Package,
  Bookmark,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface SearchResult {
  entity: string;
  id: string;
  title: string;
  subtitle: string | null;
  link: string;
}

interface SavedView {
  id: string;
  name: string;
  description: string | null;
  entity: string;
  filters: FilterCondition[];
  filterLogic: string;
  sortField: string | null;
  sortDirection: string;
  columns: string[];
  isDefault: boolean;
  isShared: boolean;
  isPinned: boolean;
}

interface FilterCondition {
  field: string;
  operator: string;
  value: string;
}

interface RecentlyViewed {
  id: string;
  entity: string;
  entityId: string;
  entityName: string | null;
  viewedAt: string;
}

const entityIcons: Record<string, React.ReactNode> = {
  contacts: <Users className="h-4 w-4" />,
  companies: <Building2 className="h-4 w-4" />,
  deals: <DollarSign className="h-4 w-4" />,
  quotes: <FileText className="h-4 w-4" />,
  tasks: <CheckSquare className="h-4 w-4" />,
  products: <Package className="h-4 w-4" />,
};

const entityLabels: Record<string, string> = {
  contacts: "Contacts",
  companies: "Companies",
  deals: "Deals",
  quotes: "Quotes",
  tasks: "Tasks",
  products: "Products",
};

const filterOperators = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
];

const entityFields: Record<string, { value: string; label: string }[]> = {
  contacts: [
    { value: "firstName", label: "First Name" },
    { value: "lastName", label: "Last Name" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "title", label: "Title" },
    { value: "status", label: "Status" },
  ],
  companies: [
    { value: "name", label: "Name" },
    { value: "industry", label: "Industry" },
    { value: "website", label: "Website" },
    { value: "employees", label: "Employees" },
    { value: "revenue", label: "Revenue" },
  ],
  deals: [
    { value: "title", label: "Title" },
    { value: "value", label: "Value" },
    { value: "stage", label: "Stage" },
    { value: "probability", label: "Probability" },
  ],
  quotes: [
    { value: "quoteNumber", label: "Quote Number" },
    { value: "title", label: "Title" },
    { value: "status", label: "Status" },
    { value: "totalAmount", label: "Total Amount" },
  ],
  tasks: [
    { value: "title", label: "Title" },
    { value: "status", label: "Status" },
    { value: "priority", label: "Priority" },
    { value: "dueDate", label: "Due Date" },
  ],
  products: [
    { value: "name", label: "Name" },
    { value: "sku", label: "SKU" },
    { value: "price", label: "Price" },
    { value: "category", label: "Category" },
  ],
};

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [selectedEntity, setSelectedEntity] = useState<string>("__all__");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewed[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [filterLogic, setFilterLogic] = useState<"AND" | "OR">("AND");
  const [showFilters, setShowFilters] = useState(false);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewDescription, setNewViewDescription] = useState("");
  const [newViewIsShared, setNewViewIsShared] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.success && data.data?.user?.id) {
          setCurrentUserId(data.data.user.id);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Load recently viewed and saved views
  useEffect(() => {
    if (!currentUserId) return;

    const loadData = async () => {
      try {
        // Load recently viewed
        const rvRes = await fetch(`/api/recently-viewed?userId=${currentUserId}&limit=10`);
        const rvData = await rvRes.json();
        if (rvData.success) {
          setRecentlyViewed(rvData.data);
        }

        // Load saved views
        const svRes = await fetch(`/api/saved-views?userId=${currentUserId}&includeShared=true`);
        const svData = await svRes.json();
        if (svData.success) {
          setSavedViews(svData.data);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    loadData();
  }, [currentUserId]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string, entity?: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        userId: currentUserId,
        limit: "50",
      });
      if (entity) {
        params.set("entity", entity);
      }

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, selectedEntity === "__all__" ? undefined : selectedEntity);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedEntity, performSearch]);

  // Track recently viewed
  const trackView = async (result: SearchResult) => {
    try {
      await fetch("/api/recently-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          entity: result.entity,
          entityId: result.id,
          entityName: result.title,
        }),
      });
    } catch (error) {
      console.error("Failed to track view:", error);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    trackView(result);
    router.push(result.link);
  };

  // Add filter
  const addFilter = () => {
    const entity = (selectedEntity && selectedEntity !== "__all__") ? selectedEntity : "contacts";
    const fields = entityFields[entity];
    setFilters([
      ...filters,
      { field: fields[0].value, operator: "contains", value: "" },
    ]);
    setShowFilters(true);
  };

  // Remove filter
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // Update filter
  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    setFilters(
      filters.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  // Save view
  const saveView = async () => {
    if (!newViewName.trim()) return;

    try {
      const res = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          name: newViewName,
          description: newViewDescription || null,
          entity: selectedEntity === "__all__" ? "all" : (selectedEntity || "all"),
          filters,
          filterLogic,
          isShared: newViewIsShared,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedViews([data.data, ...savedViews]);
        setSaveViewDialogOpen(false);
        setNewViewName("");
        setNewViewDescription("");
        setNewViewIsShared(false);
      }
    } catch (error) {
      console.error("Failed to save view:", error);
    }
  };

  // Load saved view
  const loadSavedView = (view: SavedView) => {
    setFilters(view.filters || []);
    setFilterLogic((view.filterLogic as "AND" | "OR") || "AND");
    setSelectedEntity(view.entity === "all" ? "" : view.entity);
    setShowFilters(view.filters && view.filters.length > 0);
  };

  // Delete saved view
  const deleteSavedView = async (viewId: string) => {
    try {
      const res = await fetch("/api/saved-views", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: viewId }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedViews(savedViews.filter((v) => v.id !== viewId));
      }
    } catch (error) {
      console.error("Failed to delete view:", error);
    }
  };

  // Clear recently viewed
  const clearRecentlyViewed = async () => {
    try {
      await fetch("/api/recently-viewed", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
      setRecentlyViewed([]);
    } catch (error) {
      console.error("Failed to clear recently viewed:", error);
    }
  };

  // Group results by entity
  const groupedResults = results.reduce<Record<string, SearchResult[]>>(
    (acc, result) => {
      if (!acc[result.entity]) {
        acc[result.entity] = [];
      }
      acc[result.entity].push(result);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">
          Find anything across your CRM
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Search Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts, companies, deals, and more..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                {Object.entries(entityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-accent")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {filters.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filters.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="font-medium">Filters</h3>
                  <Select
                    value={filterLogic}
                    onValueChange={(v) => setFilterLogic(v as "AND" | "OR")}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">Match All</SelectItem>
                      <SelectItem value="OR">Match Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addFilter}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Filter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaveViewDialogOpen(true)}
                    disabled={filters.length === 0}
                  >
                    <Bookmark className="h-4 w-4 mr-1" />
                    Save View
                  </Button>
                </div>
              </div>

              {filters.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No filters applied. Click "Add Filter" to narrow your search.
                </p>
              ) : (
                <div className="space-y-2">
                  {filters.map((filter, index) => {
                    const entity = (selectedEntity && selectedEntity !== "__all__") ? selectedEntity : "contacts";
                    const fields = entityFields[entity];
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={filter.field}
                          onValueChange={(v) =>
                            updateFilter(index, { field: v })
                          }
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={filter.operator}
                          onValueChange={(v) =>
                            updateFilter(index, { operator: v })
                          }
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOperators.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!["is_empty", "is_not_empty"].includes(
                          filter.operator
                        ) && (
                          <Input
                            value={filter.value}
                            onChange={(e) =>
                              updateFilter(index, { value: e.target.value })
                            }
                            placeholder="Value..."
                            className="w-[200px]"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFilter(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div className="border rounded-lg">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Searching...
                </p>
              </div>
            ) : query.length < 2 ? (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <p className="mt-2 text-muted-foreground">
                  Type at least 2 characters to search
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                <p className="mt-2 text-muted-foreground">
                  No results found for "{query}"
                </p>
              </div>
            ) : (
              <div>
                <div className="p-3 border-b bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Found {total} result{total !== 1 ? "s" : ""}
                  </p>
                </div>
                {Object.entries(groupedResults).map(([entity, entityResults]) => (
                  <div key={entity}>
                    <div className="p-2 px-4 bg-muted/30 border-b flex items-center gap-2">
                      {entityIcons[entity]}
                      <span className="text-sm font-medium">
                        {entityLabels[entity]}
                      </span>
                      <Badge variant="secondary" className="ml-auto">
                        {entityResults.length}
                      </Badge>
                    </div>
                    {entityResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full p-3 px-4 border-b last:border-b-0 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="font-medium">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-sm text-muted-foreground">
                            {result.subtitle}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Saved Views */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span className="font-medium">Saved Views</span>
              </div>
            </div>
            <div className="divide-y">
              {savedViews.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No saved views yet
                </div>
              ) : (
                savedViews.map((view) => (
                  <div
                    key={view.id}
                    className="p-3 hover:bg-muted/50 group flex items-center justify-between"
                  >
                    <button
                      onClick={() => loadSavedView(view)}
                      className="text-left flex-1"
                    >
                      <div className="font-medium text-sm">{view.name}</div>
                      {view.description && (
                        <div className="text-xs text-muted-foreground">
                          {view.description}
                        </div>
                      )}
                      <div className="flex gap-1 mt-1">
                        {view.isPinned && (
                          <Badge variant="outline" className="text-xs">
                            Pinned
                          </Badge>
                        )}
                        {view.isShared && (
                          <Badge variant="outline" className="text-xs">
                            Shared
                          </Badge>
                        )}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => deleteSavedView(view.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Viewed */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Recently Viewed</span>
                </div>
                {recentlyViewed.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={clearRecentlyViewed}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="divide-y">
              {recentlyViewed.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No recently viewed items
                </div>
              ) : (
                recentlyViewed.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      router.push(`/${item.entity}/${item.entityId}`)
                    }
                    className="w-full p-3 text-left hover:bg-muted/50 flex items-center gap-2"
                  >
                    {entityIcons[item.entity]}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.entityName || item.entityId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entityLabels[item.entity]}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save View Dialog */}
      <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Save your current filters as a view for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="viewName">Name</Label>
              <Input
                id="viewName"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="My saved view"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewDescription">Description (optional)</Label>
              <Input
                id="viewDescription"
                value={newViewDescription}
                onChange={(e) => setNewViewDescription(e.target.value)}
                placeholder="Describe this view..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isShared"
                checked={newViewIsShared}
                onCheckedChange={(checked) =>
                  setNewViewIsShared(checked as boolean)
                }
              />
              <Label htmlFor="isShared" className="text-sm">
                Share this view with my team
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveViewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveView} disabled={!newViewName.trim()}>
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search</h1>
          <p className="text-muted-foreground">Find anything across your CRM</p>
        </div>
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
