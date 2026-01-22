import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";

// Register fonts
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

/**
 * Enhanced Quote PDF Template Options
 */
export interface EnhancedQuoteOptions {
  // Logo
  showLogo: boolean;
  logoUrl?: string | null;

  // Header/Footer
  showHeader: boolean;
  showFooter: boolean;
  headerHtml?: string | null;
  footerHtml?: string | null;

  // Watermark
  showWatermark: boolean;
  watermarkText?: string;  // Auto-determined from status if not provided

  // Page numbers
  showPageNumbers: boolean;

  // Signature area
  showSignatureArea: boolean;

  // Branding colors
  primaryColor: string;
  secondaryColor: string;
}

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
  secondaryColor?: string | null;
}

interface EnhancedQuotePDFProps {
  quoteNumber: string;
  title: string;
  status: string;
  issueDate: Date;
  validUntil: Date;
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
  options: EnhancedQuoteOptions;
}

const formatCurrency = (amount: number, currency: string = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

// Determine watermark text based on status
const getWatermarkText = (status: string): string => {
  const watermarkMap: Record<string, string> = {
    DRAFT: "DRAFT",
    SENT: "SENT",
    ACCEPTED: "APPROVED",
    DECLINED: "DECLINED",
    EXPIRED: "EXPIRED",
  };
  return watermarkMap[status] || "";
};

export function EnhancedQuotePDF({
  quoteNumber,
  title,
  status,
  issueDate,
  validUntil,
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
  options,
}: EnhancedQuotePDFProps) {
  const primaryColor = options.primaryColor || business?.primaryColor || "#2563eb";
  const secondaryColor = options.secondaryColor || business?.secondaryColor || "#64748b";

  // Build company display info
  const displayCompanyName = business?.name || "Your Company";
  const fullAddress = [
    business?.tradingAddress,
    [business?.city, business?.postcode].filter(Boolean).join(" "),
    business?.country,
  ].filter(Boolean).join("\n");

  // Get watermark text
  const watermarkText = options.showWatermark
    ? (options.watermarkText || getWatermarkText(status))
    : "";

  // Logo URL with fallback
  const logoUrl = options.showLogo ? (options.logoUrl || business?.logoUrl) : null;

  // Create styles with dynamic colors
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      paddingBottom: options.showFooter || options.showPageNumbers ? 80 : 40,
      fontFamily: "Helvetica",
      fontSize: 10,
      color: "#333",
    },
    // Watermark
    watermarkContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: -1,
    },
    watermarkText: {
      fontSize: 72,
      color: "#f0f0f0",
      fontWeight: "bold",
      transform: "rotate(-45deg)",
      opacity: 0.5,
    },
    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 30,
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      paddingBottom: 15,
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      flex: 1,
      alignItems: "flex-end",
    },
    logo: {
      width: 120,
      height: 60,
      objectFit: "contain",
      marginBottom: 8,
    },
    companyName: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#1a1a1a",
      marginBottom: 4,
    },
    companyAddress: {
      fontSize: 9,
      color: secondaryColor,
      lineHeight: 1.4,
    },
    quoteTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 4,
    },
    quoteNumber: {
      fontSize: 11,
      color: secondaryColor,
      marginBottom: 2,
    },
    quoteDate: {
      fontSize: 9,
      color: secondaryColor,
    },
    statusBadge: {
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: "flex-end",
    },
    statusText: {
      fontSize: 9,
      fontWeight: "bold",
      textTransform: "uppercase",
    },
    // Sections
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
      borderLeftWidth: 3,
      borderLeftColor: primaryColor,
    },
    clientName: {
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 4,
    },
    clientDetail: {
      fontSize: 9,
      color: secondaryColor,
      marginBottom: 2,
    },
    // Table
    table: {
      marginBottom: 20,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: primaryColor,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#f3f4f6",
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    tableRowAlt: {
      backgroundColor: "#fafafa",
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
      color: "#ffffff",
      textTransform: "uppercase",
    },
    itemName: {
      fontSize: 10,
      fontWeight: "bold",
      marginBottom: 2,
    },
    itemDescription: {
      fontSize: 8,
      color: secondaryColor,
    },
    // Totals
    totalsContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 30,
    },
    totalsTable: {
      width: 220,
      backgroundColor: "#f9fafb",
      padding: 12,
      borderRadius: 4,
    },
    totalsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    totalsFinalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
      marginTop: 8,
    },
    totalsLabel: {
      fontSize: 9,
      color: secondaryColor,
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
      fontSize: 16,
      fontWeight: "bold",
      color: primaryColor,
    },
    // Valid Until
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
    // Terms
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
      color: secondaryColor,
      lineHeight: 1.5,
    },
    // Signature Area
    signatureSection: {
      marginTop: 30,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: "#e5e7eb",
    },
    signatureTitle: {
      fontSize: 11,
      fontWeight: "bold",
      marginBottom: 20,
    },
    signatureRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    signatureBox: {
      width: "45%",
    },
    signatureLine: {
      borderBottomWidth: 1,
      borderBottomColor: "#333",
      marginBottom: 4,
      height: 40,
    },
    signatureLabel: {
      fontSize: 8,
      color: secondaryColor,
    },
    // Footer
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      borderTopWidth: 1,
      borderTopColor: "#e5e7eb",
      paddingTop: 10,
    },
    footerContent: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    footerLeft: {
      flex: 1,
    },
    footerCenter: {
      flex: 1,
      alignItems: "center",
    },
    footerRight: {
      flex: 1,
      alignItems: "flex-end",
    },
    footerText: {
      fontSize: 8,
      color: "#9ca3af",
    },
    footerLegal: {
      fontSize: 7,
      color: "#9ca3af",
      marginTop: 4,
    },
    pageNumber: {
      fontSize: 8,
      color: secondaryColor,
    },
  });

  // Get status badge color
  const getStatusColor = (s: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: "#fef3c7", text: "#92400e" },
      SENT: { bg: "#dbeafe", text: "#1e40af" },
      ACCEPTED: { bg: "#d1fae5", text: "#065f46" },
      DECLINED: { bg: "#fee2e2", text: "#991b1b" },
      EXPIRED: { bg: "#f3f4f6", text: "#4b5563" },
    };
    return colors[s] || { bg: "#f3f4f6", text: "#4b5563" };
  };

  const statusColors = getStatusColor(status);

  return (
    <Document
      title={`Quote ${quoteNumber}`}
      author={business?.name || "Company"}
      subject={title}
      keywords={`quote, ${quoteNumber}, ${clientCompanyName || ""}`}
    >
      <Page
        size="A4"
        style={styles.page}
        wrap
      >
        {/* Watermark */}
        {watermarkText && (
          <View style={styles.watermarkContainer} fixed>
            <Text style={styles.watermarkText}>{watermarkText}</Text>
          </View>
        )}

        {/* Header */}
        {options.showHeader && (
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              {logoUrl && (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={logoUrl} style={styles.logo} />
              )}
              {!logoUrl && (
                <Text style={styles.companyName}>{displayCompanyName}</Text>
              )}
              {fullAddress && <Text style={styles.companyAddress}>{fullAddress}</Text>}
              {business?.phone && <Text style={styles.companyAddress}>Tel: {business.phone}</Text>}
              {business?.email && <Text style={styles.companyAddress}>{business.email}</Text>}
              {business?.website && <Text style={styles.companyAddress}>{business.website}</Text>}
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.quoteTitle}>QUOTATION</Text>
              <Text style={styles.quoteNumber}>{quoteNumber}</Text>
              <Text style={styles.quoteDate}>Issued: {format(issueDate, "d MMMM yyyy")}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusText, { color: statusColors.text }]}>{status}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Valid Until Notice */}
        <View style={styles.validUntil}>
          <Text style={styles.validUntilText}>
            This quotation is valid until {format(validUntil, "d MMMM yyyy")}
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
            <Text style={styles.sectionTitle}>RE: {title}</Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableColItem]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.tableColQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.tableColPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.tableColTotal]}>Total</Text>
          </View>
          {items.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              wrap={false}
            >
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
                  VAT {taxRate ? `(${taxRate}%)` : ""}
                </Text>
                <Text style={styles.totalsValue}>{formatCurrency(taxAmount, currency)}</Text>
              </View>
            )}
            <View style={styles.totalsFinalRow}>
              <Text style={styles.totalsFinalLabel}>Total</Text>
              <Text style={styles.totalsFinalValue}>{formatCurrency(total, currency)}</Text>
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

        {/* Signature Area */}
        {options.showSignatureArea && (
          <View style={styles.signatureSection} wrap={false}>
            <Text style={styles.signatureTitle}>Acceptance</Text>
            <Text style={styles.termsText}>
              By signing below, you confirm acceptance of this quotation and agree to the terms and conditions stated herein.
            </Text>
            <View style={styles.signatureRow}>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Signature</Text>
              </View>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Date</Text>
              </View>
            </View>
            <View style={[styles.signatureRow, { marginTop: 15 }]}>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Print Name</Text>
              </View>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Position</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        {(options.showFooter || options.showPageNumbers) && (
          <View style={styles.footer} fixed>
            <View style={styles.footerContent}>
              <View style={styles.footerLeft}>
                {options.showFooter && (
                  <Text style={styles.footerText}>Thank you for your business</Text>
                )}
              </View>
              <View style={styles.footerCenter}>
                {options.showPageNumbers && (
                  <Text
                    style={styles.pageNumber}
                    render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
                  />
                )}
              </View>
              <View style={styles.footerRight}>
                {options.showFooter && business && (
                  <Text style={styles.footerLegal}>
                    {business.legalName || business.name}
                    {business.companyNumber && ` | Reg: ${business.companyNumber}`}
                  </Text>
                )}
              </View>
            </View>
            {options.showFooter && business?.vatNumber && (
              <Text style={[styles.footerLegal, { textAlign: "center", marginTop: 2 }]}>
                VAT Registration: {business.vatNumber}
              </Text>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}

/**
 * Default options for enhanced quote PDF
 */
export const defaultEnhancedOptions: EnhancedQuoteOptions = {
  showLogo: true,
  showHeader: true,
  showFooter: true,
  showWatermark: true,
  showPageNumbers: true,
  showSignatureArea: false,
  primaryColor: "#2563eb",  // PBH Blue
  secondaryColor: "#64748b",
};
