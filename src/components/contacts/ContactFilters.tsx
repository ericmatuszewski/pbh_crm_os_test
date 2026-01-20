"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { ContactStatus } from "@/types";

interface ContactFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  onClear: () => void;
}

export function ContactFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onClear,
}: ContactFiltersProps) {
  const hasFilters = search || status;

  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value={ContactStatus.LEAD}>Lead</SelectItem>
          <SelectItem value={ContactStatus.QUALIFIED}>Qualified</SelectItem>
          <SelectItem value={ContactStatus.CUSTOMER}>Customer</SelectItem>
          <SelectItem value={ContactStatus.CHURNED}>Churned</SelectItem>
          <SelectItem value={ContactStatus.PARTNER}>Partner</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
