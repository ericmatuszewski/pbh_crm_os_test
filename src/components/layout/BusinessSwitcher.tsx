"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, ChevronDown, Check, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusiness, Business } from "@/contexts/BusinessContext";
import Link from "next/link";
import Image from "next/image";

export function BusinessSwitcher() {
  const { currentBusiness, businesses, isLoading, switchBusiness } =
    useBusiness();
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitchBusiness = async (business: Business) => {
    if (business.id === currentBusiness?.id) {
      setIsOpen(false);
      return;
    }
    await switchBusiness(business.id);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 animate-pulse" />
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>No business</span>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 h-auto"
        >
          {currentBusiness.logoUrl ? (
            <Image
              src={currentBusiness.logoUrl}
              alt={currentBusiness.name}
              width={24}
              height={24}
              className="h-6 w-6 rounded object-contain"
              unoptimized
            />
          ) : (
            <div
              className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: currentBusiness.primaryColor }}
            >
              {currentBusiness.name.charAt(0)}
            </div>
          )}
          <span className="font-medium max-w-[120px] truncate">
            {currentBusiness.name}
          </span>
          {currentBusiness.userRole && (
            <Badge variant="secondary" className="text-xs">
              {currentBusiness.userRole}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Switch Business</h4>
          <p className="text-xs text-muted-foreground">
            Select a business to work with
          </p>
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="p-2">
            {businesses.map((business) => {
              const isSelected = business.id === currentBusiness.id;
              const isParent = !business.parentId;

              return (
                <button
                  key={business.id}
                  onClick={() => handleSwitchBusiness(business)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {business.logoUrl ? (
                    <Image
                      src={business.logoUrl}
                      alt={business.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded object-contain"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="h-8 w-8 rounded flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: business.primaryColor }}
                    >
                      {business.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {business.name}
                      </span>
                      {isParent && (
                        <Badge variant="outline" className="text-xs">
                          Parent
                        </Badge>
                      )}
                    </div>
                    {business.userRole && (
                      <span className="text-xs text-muted-foreground">
                        {business.userRole}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-2 border-t">
          <Link href="/settings/business" onClick={() => setIsOpen(false)}>
            <Button variant="ghost" className="w-full justify-start text-sm">
              <Settings className="h-4 w-4 mr-2" />
              Business Settings
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
