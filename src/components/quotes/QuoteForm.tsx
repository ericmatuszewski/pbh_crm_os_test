"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { QuoteItemsTable, QuoteItemInput } from "./QuoteItemsTable";
import { useState, useEffect } from "react";
import { addDays, format } from "date-fns";
import { Product, QuoteTemplate } from "@/types";
import { FileText } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  validUntil: z.string().min(1, "Valid until date is required"),
  currency: z.string().default("USD"),
  discountType: z.enum(["percentage", "fixed", "none"]).default("none"),
  discountValue: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  termsConditions: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  templateId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface QuoteFormProps {
  onSubmit: (data: FormData & { items: QuoteItemInput[] }) => Promise<void>;
  initialData?: Partial<FormData & { items: QuoteItemInput[] }>;
  contacts?: Array<{ id: string; firstName: string; lastName: string }>;
  companies?: Array<{ id: string; name: string }>;
  isEdit?: boolean;
}

export function QuoteForm({
  onSubmit,
  initialData,
  contacts = [],
  companies = [],
  isEdit = false,
}: QuoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<QuoteItemInput[]>(
    initialData?.items || [{ name: "", description: "", quantity: 1, unitPrice: 0 }]
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const defaultValidUntil = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      contactId: initialData?.contactId || "",
      companyId: initialData?.companyId || "",
      validUntil: initialData?.validUntil || defaultValidUntil,
      currency: initialData?.currency || "USD",
      discountType: initialData?.discountType || "none",
      discountValue: initialData?.discountValue || 0,
      taxRate: initialData?.taxRate || 0,
      termsConditions: initialData?.termsConditions || "",
      paymentTerms: initialData?.paymentTerms || "Net 30",
      notes: initialData?.notes || "",
      companyName: initialData?.companyName || "",
      companyAddress: initialData?.companyAddress || "",
      templateId: initialData?.templateId || "",
    },
  });

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products?status=ACTIVE");
        const result = await response.json();
        if (result.success) {
          setProducts(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch("/api/quote-templates?isActive=true");
        const result = await response.json();
        if (result.success) {
          setTemplates(result.data);
          // Apply default template if creating new quote
          if (!isEdit && !initialData?.templateId) {
            const defaultTemplate = result.data.find((t: QuoteTemplate) => t.isDefault);
            if (defaultTemplate) {
              applyTemplate(defaultTemplate);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [isEdit, initialData?.templateId]);

  const applyTemplate = (template: QuoteTemplate) => {
    setValue("templateId", template.id);
    if (template.termsConditions) {
      setValue("termsConditions", template.termsConditions);
    }
    if (template.paymentTerms) {
      setValue("paymentTerms", template.paymentTerms);
    }
    if (template.notes) {
      setValue("notes", template.notes);
    }
    if (template.defaultDiscountPercent) {
      setValue("discountType", "percentage");
      setValue("discountValue", template.defaultDiscountPercent);
    }
    if (template.defaultTaxRate) {
      setValue("taxRate", template.defaultTaxRate);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    if (templateId === "_none") {
      setValue("templateId", "");
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      applyTemplate(template);
    }
  };

  const discountType = watch("discountType");
  const discountValue = watch("discountValue") || 0;
  const taxRate = watch("taxRate") || 0;
  const currency = watch("currency");

  // Calculate totals (including line item discounts)
  const subtotal = items.reduce((sum, item) => {
    const baseTotal = item.quantity * item.unitPrice;
    const itemDiscount = item.discount ? baseTotal * (item.discount / 100) : 0;
    return sum + (baseTotal - itemDiscount);
  }, 0);
  const discountAmount =
    discountType === "percentage"
      ? subtotal * (discountValue / 100)
      : discountType === "fixed"
      ? discountValue
      : 0;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = taxableAmount + taxAmount;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const handleFormSubmit = async (data: FormData) => {
    if (items.length === 0 || items.every((item) => !item.name)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ ...data, items: items.filter((item) => item.name) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Template Selection */}
      {templates.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <FileText className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <Label htmlFor="templateId" className="text-blue-800 font-medium">
                Quote Template
              </Label>
              <p className="text-sm text-blue-600">
                Select a template to auto-fill terms, payment details, and default pricing
              </p>
            </div>
            <Select
              value={watch("templateId") || "_none"}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger className="w-[250px] bg-white">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.isDefault && " (Default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Quote Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Quote Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="e.g., Website Development Proposal"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="validUntil">Valid Until *</Label>
            <Input id="validUntil" type="date" {...register("validUntil")} />
            {errors.validUntil && (
              <p className="text-sm text-red-500">{errors.validUntil.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactId">Contact</Label>
            <Select
              value={watch("contactId") || "_none"}
              onValueChange={(value) => setValue("contactId", value === "_none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contact..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyId">Company</Label>
            <Select
              value={watch("companyId") || "_none"}
              onValueChange={(value) => setValue("companyId", value === "_none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Line Items</h3>
        <QuoteItemsTable
          items={items}
          onChange={setItems}
          currency={currency}
          products={products}
        />
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Pricing</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={watch("currency")}
              onValueChange={(value) => setValue("currency", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountType">Additional Discount</Label>
            <Select
              value={watch("discountType")}
              onValueChange={(value: "percentage" | "fixed" | "none") =>
                setValue("discountType", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Discount</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {discountType !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="discountValue">
                {discountType === "percentage" ? "Discount %" : "Discount Amount"}
              </Label>
              <Input
                id="discountValue"
                type="number"
                min="0"
                step="0.01"
                {...register("discountValue", { valueAsNumber: true })}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              {...register("taxRate", { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal (after line discounts)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>
                Additional Discount{" "}
                {discountType === "percentage" ? `(${discountValue}%)` : ""}
              </span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tax ({taxRate}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Terms & Notes</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              {...register("paymentTerms")}
              placeholder="e.g., Net 30, 50% upfront"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              {...register("notes")}
              placeholder="Additional notes for the client"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="termsConditions">Terms & Conditions</Label>
          <textarea
            id="termsConditions"
            {...register("termsConditions")}
            className="w-full px-3 py-2 border rounded-md text-sm resize-none"
            rows={4}
            placeholder="Enter your terms and conditions..."
          />
        </div>
      </div>

      {/* Your Company Info (for PDF) */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Your Company Info (for PDF)</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              {...register("companyName")}
              placeholder="Your company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyAddress">Company Address</Label>
            <Input
              id="companyAddress"
              {...register("companyAddress")}
              placeholder="Your company address"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : isEdit
            ? "Update Quote"
            : "Create Quote"}
        </Button>
      </div>
    </form>
  );
}
