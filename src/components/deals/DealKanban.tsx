"use client";

import { Deal, DealStage } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { MoreVertical, Edit, Trash2, Eye, Building2, User } from "lucide-react";
import Link from "next/link";

interface DealKanbanProps {
  deals: Deal[];
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  onStageChange?: (dealId: string, newStage: DealStage) => void;
}

const stages: { key: DealStage; label: string; color: string }[] = [
  { key: DealStage.QUALIFICATION, label: "Qualification", color: "bg-slate-400" },
  { key: DealStage.DISCOVERY, label: "Discovery", color: "bg-blue-400" },
  { key: DealStage.PROPOSAL, label: "Proposal", color: "bg-yellow-400" },
  { key: DealStage.NEGOTIATION, label: "Negotiation", color: "bg-orange-400" },
];

export function DealKanban({ deals, onEdit, onDelete, onStageChange }: DealKanbanProps) {
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.key] = deals.filter((d) => d.stage === stage.key);
    return acc;
  }, {} as Record<DealStage, Deal[]>);

  const getStageValue = (stage: DealStage) => {
    return dealsByStage[stage]?.reduce((sum, d) => sum + d.value, 0) || 0;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <div key={stage.key} className="flex-shrink-0 w-80">
          {/* Stage Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", stage.color)} />
              <h3 className="font-medium text-sm">{stage.label}</h3>
              <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                {dealsByStage[stage.key]?.length || 0}
              </span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {formatCurrency(getStageValue(stage.key))}
            </span>
          </div>

          {/* Deal Cards */}
          <div className="space-y-2 min-h-[200px] bg-slate-100/50 rounded-lg p-2">
            {dealsByStage[stage.key]?.map((deal) => (
              <Card
                key={deal.id}
                className="cursor-pointer hover:shadow-md transition-shadow bg-white"
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm truncate flex-1 pr-2">
                      {deal.title}
                    </h4>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/deals/${deal.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(deal)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete?.(deal)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {(deal.company || deal.contact) && (
                    <div className="mt-2 space-y-1">
                      {deal.company && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{deal.company.name}</span>
                        </div>
                      )}
                      {deal.contact && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">
                            {deal.contact.firstName} {deal.contact.lastName}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(deal.value, deal.currency)}
                    </span>
                    {deal.expectedCloseDate && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(deal.expectedCloseDate)}
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {deal.probability}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!dealsByStage[stage.key] || dealsByStage[stage.key].length === 0) && (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">No deals</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
