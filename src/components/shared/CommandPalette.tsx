"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  CheckSquare,
  Package,
  Phone,
  Calendar,
  Search,
  Plus,
  Settings,
  LayoutDashboard,
  Bell,
  Mail,
  HelpCircle,
  FileSpreadsheet,
  BarChart3,
  Zap,
  Target,
} from "lucide-react";

interface SearchResult {
  entity: string;
  id: string;
  title: string;
  subtitle: string | null;
  link: string;
}

const navigationItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/", shortcut: "G D" },
  { name: "Contacts", icon: Users, href: "/contacts", shortcut: "G C" },
  { name: "Companies", icon: Building2, href: "/companies", shortcut: "G O" },
  { name: "Deals", icon: Briefcase, href: "/deals", shortcut: "G E" },
  { name: "Quotes", icon: FileText, href: "/quotes", shortcut: "G Q" },
  { name: "Products", icon: Package, href: "/products", shortcut: "G P" },
  { name: "Tasks", icon: CheckSquare, href: "/tasks", shortcut: "G T" },
  { name: "Calls", icon: Phone, href: "/calls", shortcut: "G L" },
  { name: "Calendar", icon: Calendar, href: "/calendar", shortcut: "G A" },
  { name: "Communications", icon: Mail, href: "/communications" },
  { name: "Documents", icon: FileSpreadsheet, href: "/documents" },
  { name: "Reports", icon: BarChart3, href: "/reports" },
  { name: "Automation", icon: Zap, href: "/automation" },
  { name: "Lead Scoring", icon: Target, href: "/lead-scoring" },
  { name: "Notifications", icon: Bell, href: "/notifications" },
  { name: "Settings", icon: Settings, href: "/settings" },
  { name: "Help", icon: HelpCircle, href: "/help" },
];

const quickActions = [
  { name: "New Contact", icon: Users, action: "create-contact" },
  { name: "New Company", icon: Building2, action: "create-company" },
  { name: "New Deal", icon: Briefcase, action: "create-deal" },
  { name: "New Task", icon: CheckSquare, action: "create-task" },
  { name: "New Quote", icon: FileText, action: "create-quote" },
  { name: "Schedule Call", icon: Phone, action: "schedule-call" },
];

const entityIcons: Record<string, typeof Users> = {
  contacts: Users,
  companies: Building2,
  deals: Briefcase,
  quotes: FileText,
  tasks: CheckSquare,
  products: Package,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search API
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = useCallback(
    (value: string) => {
      setOpen(false);
      setQuery("");
      setSearchResults([]);

      // Handle navigation
      if (value.startsWith("/")) {
        router.push(value);
        return;
      }

      // Handle quick actions - navigate to page with create param
      if (value.startsWith("create-")) {
        const entity = value.replace("create-", "");
        const routes: Record<string, string> = {
          contact: "/contacts?create=true",
          company: "/companies?create=true",
          deal: "/deals?create=true",
          task: "/tasks?create=true",
          quote: "/quotes?create=true",
          call: "/calls?schedule=true",
        };
        if (routes[entity]) {
          router.push(routes[entity]);
        }
        return;
      }

      // Handle search result selection
      if (value.startsWith("result-")) {
        const link = value.replace("result-", "");
        router.push(link);
      }
    },
    [router]
  );

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setQuery("");
      setSearchResults([]);
    }
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Search or type a command..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? "Searching..." : "No results found."}
        </CommandEmpty>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <CommandGroup heading="Search Results">
            {searchResults.map((result) => {
              const Icon = entityIcons[result.entity] || Search;
              return (
                <CommandItem
                  key={`${result.entity}-${result.id}`}
                  value={`result-${result.link}`}
                  onSelect={handleSelect}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {result.subtitle}
                      </span>
                    )}
                  </div>
                  <CommandShortcut className="capitalize">
                    {result.entity.slice(0, -1)}
                  </CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Quick Actions - show when no search query */}
        {!query && (
          <>
            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.action}
                  value={action.action}
                  onSelect={handleSelect}
                >
                  <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.name}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Navigation">
              {navigationItems.slice(0, 10).map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.href}
                  onSelect={handleSelect}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Show navigation when searching for pages */}
        {query && searchResults.length === 0 && !isSearching && (
          <CommandGroup heading="Pages">
            {navigationItems
              .filter((item) =>
                item.name.toLowerCase().includes(query.toLowerCase())
              )
              .map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.href}
                  onSelect={handleSelect}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer hint */}
      <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ↑↓
          </kbd>{" "}
          to navigate
        </span>
        <span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            Enter
          </kbd>{" "}
          to select
        </span>
        <span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            Esc
          </kbd>{" "}
          to close
        </span>
      </div>
    </CommandDialog>
  );
}

export default CommandPalette;
