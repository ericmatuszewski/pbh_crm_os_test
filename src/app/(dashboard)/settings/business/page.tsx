"use client";

import { useState, useEffect, useCallback } from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  Palette,
  Mail,
  FileText,
  Save,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

interface BusinessSettings {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  companyNumber: string | null;
  vatNumber: string | null;
  registeredAddress: string | null;
  tradingName: string | null;
  tradingAddress: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  salesEmail: string | null;
  website: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  quotePrefix: string;
  invoicePrefix: string;
  quoteNumberSequence: number;
  invoiceNumberSequence: number;
  defaultCurrency: string;
  defaultTaxRate: number | null;
  defaultPaymentTerms: string | null;
  termsConditions: string | null;
  isActive: boolean;
  timezone: string;
}

const CURRENCIES = [
  { value: "GBP", label: "GBP - British Pound" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
];

const TIMEZONES = [
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

export default function BusinessSettingsPage() {
  const { currentBusiness, refreshBusinesses } = useBusiness();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!currentBusiness?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/businesses/${currentBusiness.id}`);
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch business settings:", error);
      toast.error("Failed to load business settings");
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/businesses/${settings.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Business settings saved successfully");
        refreshBusinesses();
      } else {
        toast.error(data.error?.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof BusinessSettings, value: string | number | boolean | null) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No business selected. Please select a business from the header.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: settings.primaryColor }}
            >
              {settings.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{settings.name}</h1>
              <p className="text-muted-foreground text-sm">
                Business Settings
              </p>
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email / SMTP
          </TabsTrigger>
          <TabsTrigger value="quotes" className="gap-2">
            <FileText className="h-4 w-4" />
            Quotes & Invoices
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>
                Basic business information and legal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL identifier)</Label>
                  <Input
                    id="slug"
                    value={settings.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in URLs and quote numbers (e.g., {settings.slug.toUpperCase()}-QT-2024-0001)
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-4">UK Legal Entity Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Legal Name</Label>
                    <Input
                      id="legalName"
                      value={settings.legalName || ""}
                      onChange={(e) => updateField("legalName", e.target.value || null)}
                      placeholder="e.g., PBH Holdings Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tradingName">Trading Name</Label>
                    <Input
                      id="tradingName"
                      value={settings.tradingName || ""}
                      onChange={(e) => updateField("tradingName", e.target.value || null)}
                      placeholder="If different from legal name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyNumber">Companies House Number</Label>
                    <Input
                      id="companyNumber"
                      value={settings.companyNumber || ""}
                      onChange={(e) => updateField("companyNumber", e.target.value || null)}
                      placeholder="e.g., 12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">VAT Number</Label>
                    <Input
                      id="vatNumber"
                      value={settings.vatNumber || ""}
                      onChange={(e) => updateField("vatNumber", e.target.value || null)}
                      placeholder="e.g., GB123456789"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={settings.phone || ""}
                      onChange={(e) => updateField("phone", e.target.value || null)}
                      placeholder="+44 20 1234 5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">General Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email || ""}
                      onChange={(e) => updateField("email", e.target.value || null)}
                      placeholder="info@company.co.uk"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesEmail">Sales Email</Label>
                    <Input
                      id="salesEmail"
                      type="email"
                      value={settings.salesEmail || ""}
                      onChange={(e) => updateField("salesEmail", e.target.value || null)}
                      placeholder="sales@company.co.uk"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={settings.website || ""}
                      onChange={(e) => updateField("website", e.target.value || null)}
                      placeholder="https://www.company.co.uk"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => updateField("timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Business is visible and can be used
                    </p>
                  </div>
                  <Switch
                    checked={settings.isActive}
                    onCheckedChange={(checked) => updateField("isActive", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle>Business Addresses</CardTitle>
              <CardDescription>
                Trading and registered addresses for invoices and legal documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4">Trading Address</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tradingAddress">Address</Label>
                    <Textarea
                      id="tradingAddress"
                      value={settings.tradingAddress || ""}
                      onChange={(e) => updateField("tradingAddress", e.target.value || null)}
                      placeholder="123 Business Street&#10;Suite 100"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={settings.city || ""}
                        onChange={(e) => updateField("city", e.target.value || null)}
                        placeholder="London"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input
                        id="postcode"
                        value={settings.postcode || ""}
                        onChange={(e) => updateField("postcode", e.target.value || null)}
                        placeholder="SW1A 1AA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={settings.country}
                        onChange={(e) => updateField("country", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-4">Registered Address</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  The official registered address as filed with Companies House
                </p>
                <div className="space-y-2">
                  <Label htmlFor="registeredAddress">Registered Address</Label>
                  <Textarea
                    id="registeredAddress"
                    value={settings.registeredAddress || ""}
                    onChange={(e) => updateField("registeredAddress", e.target.value || null)}
                    placeholder="Full registered address including postcode"
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize your business appearance on quotes, invoices, and the CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={settings.logoUrl || ""}
                  onChange={(e) => updateField("logoUrl", e.target.value || null)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL to your company logo (PNG or JPG recommended)
                </p>
              </div>

              {settings.logoUrl && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <Label className="mb-2 block">Logo Preview</Label>
                  <img
                    src={settings.logoUrl}
                    alt="Company logo"
                    className="max-h-20 max-w-40 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="primaryColor"
                      value={settings.primaryColor}
                      onChange={(e) => updateField("primaryColor", e.target.value)}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => updateField("primaryColor", e.target.value)}
                      placeholder="#2563eb"
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for headers, buttons, and accents in documents
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="secondaryColor"
                      value={settings.secondaryColor || "#64748b"}
                      onChange={(e) => updateField("secondaryColor", e.target.value)}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={settings.secondaryColor || ""}
                      onChange={(e) => updateField("secondaryColor", e.target.value || null)}
                      placeholder="#64748b"
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for secondary elements and backgrounds
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="mb-2 block">Color Preview</Label>
                <div className="p-6 border rounded-lg">
                  <div
                    className="p-4 rounded-t-lg text-white flex items-center justify-between"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <span className="font-bold">{settings.name}</span>
                    <Badge className="bg-white/20 hover:bg-white/30">Preview</Badge>
                  </div>
                  <div
                    className="p-4 rounded-b-lg text-white"
                    style={{ backgroundColor: settings.secondaryColor || "#64748b" }}
                  >
                    <span className="text-sm">Secondary color section</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email / SMTP Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>
                Configure SMTP settings for sending emails from this business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Each business can have its own email domain and SMTP settings.
                  Emails sent from this business will use these settings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpFromEmail">From Email</Label>
                  <Input
                    id="smtpFromEmail"
                    type="email"
                    value={settings.smtpFromEmail || ""}
                    onChange={(e) => updateField("smtpFromEmail", e.target.value || null)}
                    placeholder="sales@yourbusiness.co.uk"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromName">From Name</Label>
                  <Input
                    id="smtpFromName"
                    value={settings.smtpFromName || ""}
                    onChange={(e) => updateField("smtpFromName", e.target.value || null)}
                    placeholder="Your Business Sales"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-4">SMTP Server Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={settings.smtpHost || ""}
                      onChange={(e) => updateField("smtpHost", e.target.value || null)}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={settings.smtpPort || ""}
                      onChange={(e) => updateField("smtpPort", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={settings.smtpUser || ""}
                      onChange={(e) => updateField("smtpUser", e.target.value || null)}
                      placeholder="username or email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <div className="relative">
                      <Input
                        id="smtpPassword"
                        type={showSmtpPassword ? "text" : "password"}
                        value={settings.smtpPassword || ""}
                        onChange={(e) => updateField("smtpPassword", e.target.value || null)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      >
                        {showSmtpPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" disabled>
                  Test SMTP Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes & Invoices Tab */}
        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Quotes & Invoices</CardTitle>
              <CardDescription>
                Configure quote and invoice defaults, numbering, and terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4">Document Numbering</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quotePrefix">Quote Prefix</Label>
                    <Input
                      id="quotePrefix"
                      value={settings.quotePrefix}
                      onChange={(e) => updateField("quotePrefix", e.target.value)}
                      placeholder="QT"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: {settings.slug.toUpperCase()}-{settings.quotePrefix}-2024-0001
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                    <Input
                      id="invoicePrefix"
                      value={settings.invoicePrefix}
                      onChange={(e) => updateField("invoicePrefix", e.target.value)}
                      placeholder="INV"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: {settings.slug.toUpperCase()}-{settings.invoicePrefix}-2024-0001
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Quote Sequence</Label>
                    <Input
                      value={settings.quoteNumberSequence}
                      disabled
                      className="bg-muted font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Invoice Sequence</Label>
                    <Input
                      value={settings.invoiceNumberSequence}
                      disabled
                      className="bg-muted font-mono"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-4">Financial Defaults</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Select
                      value={settings.defaultCurrency}
                      onValueChange={(value) => updateField("defaultCurrency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                    <Input
                      id="defaultTaxRate"
                      type="number"
                      step="0.01"
                      value={settings.defaultTaxRate ?? ""}
                      onChange={(e) => updateField("defaultTaxRate", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="20"
                    />
                    <p className="text-xs text-muted-foreground">
                      UK VAT is currently 20%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultPaymentTerms">Default Payment Terms</Label>
                    <Input
                      id="defaultPaymentTerms"
                      value={settings.defaultPaymentTerms || ""}
                      onChange={(e) => updateField("defaultPaymentTerms", e.target.value || null)}
                      placeholder="Net 30"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="termsConditions">Default Terms & Conditions</Label>
                <Textarea
                  id="termsConditions"
                  value={settings.termsConditions || ""}
                  onChange={(e) => updateField("termsConditions", e.target.value || null)}
                  placeholder="Enter your standard terms and conditions..."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  These terms will be included by default on all quotes and invoices
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
