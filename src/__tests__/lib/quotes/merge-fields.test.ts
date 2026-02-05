import { processMergeFields, getAvailableMergeFields, MergeFieldContext } from "@/lib/quotes/merge-fields";

describe("processMergeFields", () => {
  const baseQuote = {
    id: "quote-123",
    quoteNumber: "Q-2024-001",
    title: "Enterprise Software License",
    status: "DRAFT",
    subtotal: 10000,
    discountAmount: 500,
    taxAmount: 1900,
    total: 11400,
    currency: "USD",
    validUntil: new Date("2024-12-31"),
    issueDate: new Date("2024-01-15"),
    notes: "Payment due within 30 days",
    terms: "Net 30",
  };

  const baseContact = {
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    phone: "+1-555-0123",
    title: "CTO",
  };

  const baseCompany = {
    name: "Acme Corporation",
    website: "https://acme.com",
    phone: "+1-555-0100",
    address: "123 Main St",
    city: "San Francisco",
    state: "CA",
    postalCode: "94102",
    country: "USA",
  };

  const baseBusiness = {
    name: "Our Company LLC",
    email: "sales@ourcompany.com",
    phone: "+1-555-9999",
    website: "https://ourcompany.com",
    address: "456 Business Ave",
  };

  const baseUser = {
    name: "Sarah Jones",
    email: "sarah@ourcompany.com",
  };

  const baseLineItems = [
    {
      productName: "Premium License",
      description: "Annual subscription",
      quantity: 5,
      unitPrice: 2000,
      discount: 0,
      total: 10000,
    },
  ];

  describe("empty and null handling", () => {
    it("should return empty string for empty template", () => {
      const result = processMergeFields("", { quote: baseQuote });
      expect(result).toBe("");
    });

    it("should return template unchanged if no merge fields present", () => {
      const template = "Hello, this is a plain message.";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe(template);
    });

    it("should preserve unknown merge fields", () => {
      const template = "Hello {{unknown.field}}!";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Hello {{unknown.field}}!");
    });
  });

  describe("quote fields", () => {
    it("should replace quote.number", () => {
      const template = "Quote: {{quote.number}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Quote: Q-2024-001");
    });

    it("should replace quote.quoteNumber", () => {
      const template = "Quote: {{quote.quoteNumber}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Quote: Q-2024-001");
    });

    it("should replace quoteNumber shorthand", () => {
      const template = "Quote: {{quoteNumber}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Quote: Q-2024-001");
    });

    it("should replace quote.title", () => {
      const template = "Title: {{quote.title}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Title: Enterprise Software License");
    });

    it("should replace quote.status", () => {
      const template = "Status: {{quote.status}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Status: DRAFT");
    });

    it("should format quote.subtotal as currency", () => {
      const template = "Subtotal: {{quote.subtotal}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Subtotal: $10,000.00");
    });

    it("should format quote.discount as currency", () => {
      const template = "Discount: {{quote.discount}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Discount: $500.00");
    });

    it("should format quote.tax as currency", () => {
      const template = "Tax: {{quote.tax}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Tax: $1,900.00");
    });

    it("should format quote.total as currency", () => {
      const template = "Total: {{quote.total}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Total: $11,400.00");
    });

    it("should replace quote.currency", () => {
      const template = "Currency: {{quote.currency}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Currency: USD");
    });

    it("should format quote.validUntil as date", () => {
      const template = "Valid until: {{quote.validUntil}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toContain("December 31");
      expect(result).toContain("2024");
    });

    it("should format quote.issueDate", () => {
      const template = "Issue date: {{quote.issueDate}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toContain("January 15");
      expect(result).toContain("2024");
    });

    it("should format issueDate shorthand", () => {
      const template = "Issue date: {{issueDate}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toContain("January 15");
    });

    it("should handle different currencies (GBP)", () => {
      const gbpQuote = { ...baseQuote, currency: "GBP" };
      const template = "Total: {{quote.total}}";
      const result = processMergeFields(template, { quote: gbpQuote });
      expect(result).toBe("Total: £11,400.00");
    });

    it("should handle different currencies (EUR)", () => {
      const eurQuote = { ...baseQuote, currency: "EUR" };
      const template = "Total: {{quote.total}}";
      const result = processMergeFields(template, { quote: eurQuote });
      expect(result).toContain("11,400.00");
    });
  });

  describe("contact fields", () => {
    it("should replace contact.firstName", () => {
      const template = "Dear {{contact.firstName}},";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Dear John,");
    });

    it("should replace contact.lastName", () => {
      const template = "Mr. {{contact.lastName}}";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Mr. Smith");
    });

    it("should replace contact.fullName", () => {
      const template = "Attention: {{contact.fullName}}";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Attention: John Smith");
    });

    it("should replace contact.name shorthand", () => {
      const template = "Attention: {{contact.name}}";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Attention: John Smith");
    });

    it("should replace contactName shorthand", () => {
      const template = "Attention: {{contactName}}";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Attention: John Smith");
    });

    it("should replace contact.email", () => {
      const template = "Email: {{contact.email}}";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Email: john.smith@example.com");
    });

    it("should replace contact.phone", () => {
      const template = "Phone: {{contact.phone}}";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Phone: +1-555-0123");
    });

    it("should replace contact.title", () => {
      const template = "Title: {{contact.title}}";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Title: CTO");
    });

    it("should handle missing contact gracefully", () => {
      const template = "Dear {{contact.firstName}},";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Dear {{contact.firstName}},");
    });

    it("should handle null contact fields", () => {
      const contactWithNulls = { ...baseContact, email: null, phone: null };
      const template = "Email: {{contact.email}}, Phone: {{contact.phone}}";
      const result = processMergeFields(template, { quote: baseQuote, contact: contactWithNulls });
      expect(result).toBe("Email: , Phone: ");
    });
  });

  describe("company fields", () => {
    it("should replace company.name", () => {
      const template = "Company: {{company.name}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("Company: Acme Corporation");
    });

    it("should replace companyName shorthand", () => {
      const template = "Company: {{companyName}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("Company: Acme Corporation");
    });

    it("should replace company.website", () => {
      const template = "Website: {{company.website}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("Website: https://acme.com");
    });

    it("should replace company.phone", () => {
      const template = "Phone: {{company.phone}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("Phone: +1-555-0100");
    });

    it("should replace company.address", () => {
      const template = "Address: {{company.address}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("Address: 123 Main St");
    });

    it("should replace company.city", () => {
      const template = "City: {{company.city}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("City: San Francisco");
    });

    it("should replace company.state", () => {
      const template = "State: {{company.state}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("State: CA");
    });

    it("should replace company.postalCode", () => {
      const template = "ZIP: {{company.postalCode}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("ZIP: 94102");
    });

    it("should replace company.country", () => {
      const template = "Country: {{company.country}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("Country: USA");
    });

    it("should build company.fullAddress from components", () => {
      const template = "Full Address: {{company.fullAddress}}";
      const result = processMergeFields(template, { quote: baseQuote, company: baseCompany });
      expect(result).toBe("Full Address: 123 Main St, San Francisco, CA, 94102, USA");
    });

    it("should handle missing company gracefully", () => {
      const template = "Company: {{company.name}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).toBe("Company: {{company.name}}");
    });
  });

  describe("business fields", () => {
    it("should replace business.name", () => {
      const template = "From: {{business.name}}";
      const result = processMergeFields(template, { quote: baseQuote, business: baseBusiness });
      expect(result).toBe("From: Our Company LLC");
    });

    it("should replace business.email", () => {
      const template = "Reply to: {{business.email}}";
      const result = processMergeFields(template, { quote: baseQuote, business: baseBusiness });
      expect(result).toBe("Reply to: sales@ourcompany.com");
    });

    it("should replace business.phone", () => {
      const template = "Call: {{business.phone}}";
      const result = processMergeFields(template, { quote: baseQuote, business: baseBusiness });
      expect(result).toBe("Call: +1-555-9999");
    });

    it("should replace sender.name (alias for business.name)", () => {
      const template = "Sent by: {{sender.name}}";
      const result = processMergeFields(template, { quote: baseQuote, business: baseBusiness });
      expect(result).toBe("Sent by: Our Company LLC");
    });
  });

  describe("user fields", () => {
    it("should replace user.name", () => {
      const template = "Prepared by: {{user.name}}";
      const result = processMergeFields(template, { quote: baseQuote, user: baseUser });
      expect(result).toBe("Prepared by: Sarah Jones");
    });

    it("should replace user.email", () => {
      const template = "Contact: {{user.email}}";
      const result = processMergeFields(template, { quote: baseQuote, user: baseUser });
      expect(result).toBe("Contact: sarah@ourcompany.com");
    });

    it("should replace owner.name (alias for user.name)", () => {
      const template = "Account owner: {{owner.name}}";
      const result = processMergeFields(template, { quote: baseQuote, user: baseUser });
      expect(result).toBe("Account owner: Sarah Jones");
    });
  });

  describe("line items fields", () => {
    it("should replace lineItems.count", () => {
      const template = "Items: {{lineItems.count}}";
      const result = processMergeFields(template, { quote: baseQuote, lineItems: baseLineItems });
      expect(result).toBe("Items: 1");
    });

    it("should replace lineItems.total", () => {
      const template = "Line items total: {{lineItems.total}}";
      const result = processMergeFields(template, { quote: baseQuote, lineItems: baseLineItems });
      expect(result).toBe("Line items total: $10,000.00");
    });

    it("should count multiple line items", () => {
      const multipleItems = [
        ...baseLineItems,
        { productName: "Support", description: "Annual support", quantity: 1, unitPrice: 500, total: 500 },
      ];
      const template = "Items: {{lineItems.count}}";
      const result = processMergeFields(template, { quote: baseQuote, lineItems: multipleItems });
      expect(result).toBe("Items: 2");
    });
  });

  describe("date fields", () => {
    it("should replace currentDate", () => {
      const template = "Generated on: {{currentDate}}";
      const result = processMergeFields(template, { quote: baseQuote });
      // Just check that it's replaced with something date-like
      expect(result).not.toContain("{{currentDate}}");
      expect(result).toMatch(/Generated on: [A-Z][a-z]+/);
    });

    it("should replace today (alias for currentDate)", () => {
      const template = "Date: {{today}}";
      const result = processMergeFields(template, { quote: baseQuote });
      expect(result).not.toContain("{{today}}");
    });
  });

  describe("whitespace handling", () => {
    it("should handle fields with extra whitespace", () => {
      const template = "Hello {{ contact.firstName }}!";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Hello John!");
    });

    it("should handle fields with tabs", () => {
      const template = "Hello {{\tcontact.firstName\t}}!";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Hello John!");
    });
  });

  describe("multiple fields in template", () => {
    it("should replace multiple different fields", () => {
      const template = "Dear {{contact.firstName}} {{contact.lastName}}, your quote {{quote.number}} is ready.";
      const result = processMergeFields(template, { quote: baseQuote, contact: baseContact });
      expect(result).toBe("Dear John Smith, your quote Q-2024-001 is ready.");
    });

    it("should handle complex email template", () => {
      const template = `
Dear {{contact.firstName}},

Thank you for your interest in {{business.name}}!

Quote: {{quote.number}}
Title: {{quote.title}}
Total: {{quote.total}}
Valid Until: {{quote.validUntil}}

Best regards,
{{user.name}}
{{business.name}}
      `.trim();

      const result = processMergeFields(template, {
        quote: baseQuote,
        contact: baseContact,
        business: baseBusiness,
        user: baseUser,
      });

      expect(result).toContain("Dear John,");
      expect(result).toContain("Our Company LLC");
      expect(result).toContain("Q-2024-001");
      expect(result).toContain("Enterprise Software License");
      expect(result).toContain("$11,400.00");
      expect(result).toContain("Sarah Jones");
    });
  });

  describe("full context", () => {
    it("should handle complete context with all fields", () => {
      const fullContext: MergeFieldContext = {
        quote: baseQuote,
        contact: baseContact,
        company: baseCompany,
        business: baseBusiness,
        user: baseUser,
        lineItems: baseLineItems,
      };

      const template = "{{contact.fullName}} at {{company.name}} - Quote {{quote.number}}";
      const result = processMergeFields(template, fullContext);
      expect(result).toBe("John Smith at Acme Corporation - Quote Q-2024-001");
    });
  });
});

describe("getAvailableMergeFields", () => {
  it("should return an array of field categories", () => {
    const fields = getAvailableMergeFields();
    expect(Array.isArray(fields)).toBe(true);
    expect(fields.length).toBeGreaterThan(0);
  });

  it("should have Quote category", () => {
    const fields = getAvailableMergeFields();
    const quoteCategory = fields.find((c) => c.category === "Quote");
    expect(quoteCategory).toBeDefined();
    expect(quoteCategory?.fields.length).toBeGreaterThan(0);
  });

  it("should have Contact category", () => {
    const fields = getAvailableMergeFields();
    const contactCategory = fields.find((c) => c.category === "Contact");
    expect(contactCategory).toBeDefined();
    expect(contactCategory?.fields.length).toBeGreaterThan(0);
  });

  it("should have Company category", () => {
    const fields = getAvailableMergeFields();
    const companyCategory = fields.find((c) => c.category === "Company");
    expect(companyCategory).toBeDefined();
    expect(companyCategory?.fields.length).toBeGreaterThan(0);
  });

  it("should have Other category", () => {
    const fields = getAvailableMergeFields();
    const otherCategory = fields.find((c) => c.category === "Other");
    expect(otherCategory).toBeDefined();
  });

  it("should have field objects with name and description", () => {
    const fields = getAvailableMergeFields();
    const quoteCategory = fields.find((c) => c.category === "Quote");
    const firstField = quoteCategory?.fields[0];
    expect(firstField).toHaveProperty("name");
    expect(firstField).toHaveProperty("description");
    expect(firstField?.name).toMatch(/^{{.*}}$/);
  });

  it("should include quote.number field", () => {
    const fields = getAvailableMergeFields();
    const quoteCategory = fields.find((c) => c.category === "Quote");
    const numberField = quoteCategory?.fields.find((f) => f.name === "{{quote.number}}");
    expect(numberField).toBeDefined();
    expect(numberField?.description).toBe("Quote number");
  });

  it("should include contact.fullName field", () => {
    const fields = getAvailableMergeFields();
    const contactCategory = fields.find((c) => c.category === "Contact");
    const fullNameField = contactCategory?.fields.find((f) => f.name === "{{contact.fullName}}");
    expect(fullNameField).toBeDefined();
  });
});
