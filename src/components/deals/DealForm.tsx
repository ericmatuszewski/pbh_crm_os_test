"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DealStage, CreateDealInput } from "@/types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const dealSchema = z.object({
  title: z.string().min(1, "Deal title is required"),
  value: z.number().min(0, "Value must be positive"),
  currency: z.string().default("GBP"),
  stage: z.nativeEnum(DealStage).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDealInput) => Promise<void>;
  initialData?: Partial<DealFormData>;
  contacts?: { id: string; name: string }[];
  companies?: { id: string; name: string }[];
  isEdit?: boolean;
}

const stageProbabilities: Record<DealStage, number> = {
  QUALIFICATION: 10,
  DISCOVERY: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

export function DealForm({
  open,
  onClose,
  onSubmit,
  initialData,
  contacts = [],
  companies = [],
  isEdit = false,
}: DealFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: initialData?.title || "",
      value: initialData?.value || 0,
      currency: initialData?.currency || "USD",
      stage: initialData?.stage || DealStage.QUALIFICATION,
      probability: initialData?.probability || 10,
      expectedCloseDate: initialData?.expectedCloseDate || "",
      contactId: initialData?.contactId || "",
      companyId: initialData?.companyId || "",
    },
  });

  const handleStageChange = (stage: DealStage) => {
    setValue("stage", stage);
    setValue("probability", stageProbabilities[stage]);
  };

  const handleFormSubmit = async (data: DealFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: data.title,
        value: data.value,
        currency: data.currency,
        stage: data.stage,
        probability: data.probability,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
        contactId: data.contactId || undefined,
        companyId: data.companyId || undefined,
        ownerId: "current-user-id", // In real app, get from auth context
      });
      reset();
      onClose();
    } catch (error) {
      console.error("Failed to save deal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Deal" : "Create New Deal"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the deal information below."
              : "Fill in the information to create a new deal."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Deal Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Enterprise License Agreement"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Value *</Label>
              <Input
                id="value"
                type="number"
                {...register("value", { valueAsNumber: true })}
                placeholder="50000"
              />
              {errors.value && (
                <p className="text-xs text-destructive">{errors.value.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={watch("currency") || "USD"}
                onValueChange={(value) => setValue("currency", value)}
              >
                <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={watch("stage") || DealStage.QUALIFICATION}
                onValueChange={(value) => handleStageChange(value as DealStage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DealStage.QUALIFICATION}>Qualification</SelectItem>
                  <SelectItem value={DealStage.DISCOVERY}>Discovery</SelectItem>
                  <SelectItem value={DealStage.PROPOSAL}>Proposal</SelectItem>
                  <SelectItem value={DealStage.NEGOTIATION}>Negotiation</SelectItem>
                  <SelectItem value={DealStage.CLOSED_WON}>Closed Won</SelectItem>
                  <SelectItem value={DealStage.CLOSED_LOST}>Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min={0}
                max={100}
                {...register("probability", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
            <Input
              id="expectedCloseDate"
              type="date"
              {...register("expectedCloseDate")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact</Label>
              <Select
                value={watch("contactId") || ""}
                onValueChange={(value) => setValue("contactId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Select
                value={watch("companyId") || ""}
                onValueChange={(value) => setValue("companyId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update Deal" : "Create Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
