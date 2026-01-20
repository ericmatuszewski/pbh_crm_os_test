"use client";

import { DealStage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DealPipelineProps {
  deals: {
    id: string;
    title: string;
    value: number;
    stage: DealStage;
    company?: { name: string };
  }[];
}

const stages: { key: DealStage; label: string; color: string }[] = [
  { key: "QUALIFICATION", label: "Qualification", color: "bg-slate-400" },
  { key: "DISCOVERY", label: "Discovery", color: "bg-blue-400" },
  { key: "PROPOSAL", label: "Proposal", color: "bg-yellow-400" },
  { key: "NEGOTIATION", label: "Negotiation", color: "bg-orange-400" },
  { key: "CLOSED_WON", label: "Closed Won", color: "bg-green-500" },
  { key: "CLOSED_LOST", label: "Closed Lost", color: "bg-red-500" },
];

export function DealPipeline({ deals }: DealPipelineProps) {
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.key] = deals.filter((d) => d.stage === stage.key);
    return acc;
  }, {} as Record<DealStage, typeof deals>);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages
        .filter((s) => s.key !== "CLOSED_WON" && s.key !== "CLOSED_LOST")
        .map((stage) => (
          <div key={stage.key} className="flex-shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-3 h-3 rounded-full", stage.color)} />
              <h3 className="font-medium text-sm">{stage.label}</h3>
              <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                {dealsByStage[stage.key]?.length || 0}
              </span>
            </div>
            <div className="space-y-2">
              {dealsByStage[stage.key]?.map((deal) => (
                <Card
                  key={deal.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm truncate">
                      {deal.title}
                    </h4>
                    {deal.company && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {deal.company.name}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-2">
                      ${deal.value.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {(!dealsByStage[stage.key] ||
                dealsByStage[stage.key].length === 0) && (
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
