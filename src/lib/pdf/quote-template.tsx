import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";

// Register fonts (using system fonts)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 9,
    color: "#666",
    lineHeight: 1.4,
  },
  quoteTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 4,
  },
  quoteNumber: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  quoteDate: {
    fontSize: 9,
    color: "#666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
  },
  clientInfo: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 4,
  },
  clientName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableColItem: {
    flex: 3,
  },
  tableColQty: {
    flex: 1,
    textAlign: "right",
  },
  tableColPrice: {
    flex: 1.5,
    textAlign: "right",
  },
  tableColTotal: {
    flex: 1.5,
    textAlign: "right",
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  itemName: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 8,
    color: "#6b7280",
  },
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  totalsTable: {
    width: 200,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: "#2563eb",
    marginTop: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: "#666",
  },
  totalsValue: {
    fontSize: 10,
    textAlign: "right",
  },
  totalsFinalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  totalsFinalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563eb",
  },
  termsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6,
  },
  termsText: {
    fontSize: 8,
    color: "#666",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
  footerLegal: {
    fontSize: 7,
    color: "#9ca3af",
    marginTop: 4,
  },
  validUntil: {
    backgroundColor: "#fef3c7",
    padding: 8,
    borderRadius: 4,
    marginBottom: 20,
  },
  validUntilText: {
    fontSize: 9,
    color: "#92400e",
    textAlign: "center",
  },
});

interface QuoteItem {
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface BusinessBranding {
  name: string;
  legalName?: string | null;
  tradingAddress?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  vatNumber?: string | null;
  companyNumber?: string | null;
  logoUrl?: string | null;
  primaryColor: string;
}

interface QuotePDFProps {
  quoteNumber: string;
  title: string;
  issueDate: Date;
  validUntil: Date;
  companyName?: string | null;
  companyAddress?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  clientCompanyName?: string | null;
  items: QuoteItem[];
  subtotal: number;
  discountType?: string | null;
  discountValue?: number | null;
  discountAmount: number;
  taxRate?: number | null;
  taxAmount: number;
  total: number;
  currency: string;
  termsConditions?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  business?: BusinessBranding | null;
}

const formatCurrency = (amount: number, currency: string = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

export function QuotePDF({
  quoteNumber,
  title,
  issueDate,
  validUntil,
  companyName,
  companyAddress,
  contactName,
  contactEmail,
  clientCompanyName,
  items,
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  taxRate,
  taxAmount,
  total,
  currency,
  termsConditions,
  paymentTerms,
  notes,
  business,
}: QuotePDFProps) {
  // Use business branding color or default to blue
  const primaryColor = business?.primaryColor || "#2563eb";

  // Build company display info - prefer business data over quote-level data
  const displayCompanyName = business?.name || companyName || "Your Company";
  const displayAddress = business?.tradingAddress || companyAddress;
  const displayCity = business?.city;
  const displayPostcode = business?.postcode;
  const displayCountry = business?.country;
  const displayPhone = business?.phone;
  const displayEmail = business?.email;
  const displayWebsite = business?.website;

  // Build full address string
  const fullAddress = [
    displayAddress,
    [displayCity, displayPostcode].filter(Boolean).join(" "),
    displayCountry,
  ].filter(Boolean).join("\n");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{displayCompanyName}</Text>
            {fullAddress && <Text style={styles.companyAddress}>{fullAddress}</Text>}
            {displayPhone && <Text style={styles.companyAddress}>Tel: {displayPhone}</Text>}
            {displayEmail && <Text style={styles.companyAddress}>{displayEmail}</Text>}
            {displayWebsite && <Text style={styles.companyAddress}>{displayWebsite}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.quoteTitle, { color: primaryColor }]}>QUOTE</Text>
            <Text style={styles.quoteNumber}>{quoteNumber}</Text>
            <Text style={styles.quoteDate}>Issued: {format(issueDate, "d MMMM yyyy")}</Text>
          </View>
        </View>

        {/* Valid Until Notice */}
        <View style={styles.validUntil}>
          <Text style={styles.validUntilText}>
            This quote is valid until {format(validUntil, "d MMMM yyyy")}
          </Text>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote For</Text>
          <View style={styles.clientInfo}>
            {contactName && <Text style={styles.clientName}>{contactName}</Text>}
            {clientCompanyName && <Text style={styles.clientDetail}>{clientCompanyName}</Text>}
            {contactEmail && <Text style={styles.clientDetail}>{contactEmail}</Text>}
          </View>
        </View>

        {/* Quote Title */}
        {title && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Regarding: {title}</Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableColItem]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.tableColQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.tableColPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.tableColTotal]}>Total</Text>
          </View>
          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableColItem}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
              </View>
              <Text style={[styles.totalsValue, styles.tableColQty]}>{item.quantity}</Text>
              <Text style={[styles.totalsValue, styles.tableColPrice]}>
                {formatCurrency(item.unitPrice, currency)}
              </Text>
              <Text style={[styles.totalsValue, styles.tableColTotal]}>
                {formatCurrency(item.total, currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(subtotal, currency)}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Discount {discountType === "percentage" && discountValue ? `(${discountValue}%)` : ""}
                </Text>
                <Text style={styles.totalsValue}>-{formatCurrency(discountAmount, currency)}</Text>
              </View>
            )}
            {taxAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Tax {taxRate ? `(${taxRate}%)` : ""}
                </Text>
                <Text style={styles.totalsValue}>{formatCurrency(taxAmount, currency)}</Text>
              </View>
            )}
            <View style={[styles.totalsFinalRow, { borderTopColor: primaryColor }]}>
              <Text style={styles.totalsFinalLabel}>Total</Text>
              <Text style={[styles.totalsFinalValue, { color: primaryColor }]}>{formatCurrency(total, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.section}>
            <Text style={styles.termsTitle}>Notes</Text>
            <Text style={styles.termsText}>{notes}</Text>
          </View>
        )}

        {/* Payment Terms */}
        {paymentTerms && (
          <View style={styles.section}>
            <Text style={styles.termsTitle}>Payment Terms</Text>
            <Text style={styles.termsText}>{paymentTerms}</Text>
          </View>
        )}

        {/* Terms & Conditions */}
        {termsConditions && (
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{termsConditions}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business</Text>
          {business && (
            <Text style={styles.footerLegal}>
              {business.legalName || business.name}
              {business.companyNumber && ` | Company No: ${business.companyNumber}`}
              {business.vatNumber && ` | VAT No: ${business.vatNumber}`}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
