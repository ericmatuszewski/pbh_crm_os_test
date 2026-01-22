"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { MoreVertical, Edit, Trash2, Eye, Building2, User, GripVertical } from "lucide-react";
import Link from "next/link";

interface DealKanbanProps {
  deals: Deal[];
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  onStageChange?: (dealId: string, newStage: string, probability: number) => void;
  stages?: StageConfig[];
}

export interface StageConfig {
  id: string;
  name: string;
  color: string;
  probability: number;
  isClosed?: boolean;
  isWon?: boolean;
}

const defaultStages: StageConfig[] = [
  { id: DealStage.QUALIFICATION, name: "Qualification", color: "#94a3b8", probability: 10 },
  { id: DealStage.DISCOVERY, name: "Discovery", color: "#3b82f6", probability: 25 },
  { id: DealStage.PROPOSAL, name: "Proposal", color: "#eab308", probability: 50 },
  { id: DealStage.NEGOTIATION, name: "Negotiation", color: "#f97316", probability: 75 },
];

interface SortableDealCardProps {
  deal: Deal;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  isDragging?: boolean;
}

function SortableDealCard({ deal, onEdit, onDelete, isDragging }: SortableDealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DealCard
        deal={deal}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

interface DealCardProps {
  deal: Deal;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

function DealCard({ deal, onEdit, onDelete, isDragging, dragHandleProps }: DealCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all bg-white",
        isDragging && "shadow-lg ring-2 ring-primary"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div
            {...dragHandleProps}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-sm truncate flex-1 pr-2">
                {deal.title}
              </h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 flex-shrink-0">
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
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${deal.probability}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {deal.probability}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DroppableColumnProps {
  stage: StageConfig;
  deals: Deal[];
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
}

function DroppableColumn({ stage, deals, onEdit, onDelete }: DroppableColumnProps) {
  const stageValue = deals.reduce((sum, d) => sum + d.value, 0);

  // Convert hex color to bg class or use inline style
  const colorStyle = stage.color.startsWith("#")
    ? { backgroundColor: stage.color }
    : {};
  const colorClass = stage.color.startsWith("bg-") ? stage.color : "";

  return (
    <div className="flex-shrink-0 w-80">
      {/* Stage Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className={cn("w-3 h-3 rounded-full", colorClass)}
            style={colorStyle}
          />
          <h3 className="font-medium text-sm">{stage.name}</h3>
          <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {formatCurrency(stageValue)}
        </span>
      </div>

      {/* Deal Cards */}
      <div
        className="space-y-2 min-h-[200px] bg-slate-100/50 rounded-lg p-2"
        data-stage={stage.id}
      >
        <SortableContext
          items={deals.map(d => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <SortableDealCard
              key={deal.id}
              deal={deal}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Drop deals here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DealKanban({ deals, onEdit, onDelete, onStageChange, stages: customStages }: DealKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  // Use custom stages or filter default stages to only show non-closed
  const stages = customStages
    ? customStages.filter(s => !s.isClosed)
    : defaultStages;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter((d) => d.stage === stage.id || d.stageId === stage.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id);
    if (deal) {
      setActiveDeal(deal);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Find which column we're over
    const overElement = document.querySelector(`[data-stage]`);
    // This is handled by DragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const activeDealId = active.id as string;
    const activeDealData = deals.find(d => d.id === activeDealId);

    if (!activeDealData) return;

    // Find the target stage
    let targetStage: StageConfig | null = null;

    // Check if dropped on another deal
    const overDeal = deals.find(d => d.id === over.id);
    if (overDeal) {
      // Find the stage for this deal
      const currentStage = overDeal.stageId || overDeal.stage;
      targetStage = stages.find(s => s.id === currentStage) || null;
    } else {
      // Check if dropped on a stage container
      const overElement = document.querySelector(`[data-stage="${over.id}"]`);
      if (overElement) {
        targetStage = stages.find(s => s.id === over.id) || null;
      }
    }

    // If target stage is different from current stage, update
    const currentStageId = activeDealData.stageId || activeDealData.stage;
    if (targetStage && targetStage.id !== currentStageId) {
      onStageChange?.(activeDealId, targetStage.id, targetStage.probability);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <DroppableColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage[stage.id] || []}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal && (
          <div className="w-80">
            <DealCard deal={activeDeal} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
