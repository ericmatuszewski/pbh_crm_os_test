import prisma from "@/lib/prisma";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOf?: string; // Contact ID
  matchType?: "email" | "phone" | "name_company";
}

export async function checkDuplicate(data: {
  email?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}): Promise<DuplicateCheckResult> {
  // Priority 1: Check by email (most reliable)
  if (data.email) {
    const existingByEmail = await prisma.contact.findFirst({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingByEmail) {
      return {
        isDuplicate: true,
        duplicateOf: existingByEmail.id,
        matchType: "email",
      };
    }
  }

  // Priority 2: Check by phone
  if (data.phone) {
    // Normalize phone for comparison - remove all non-digits
    const normalizedPhone = data.phone.replace(/\D/g, "");

    if (normalizedPhone.length >= 7) {
      const existingByPhone = await prisma.contact.findFirst({
        where: {
          phone: {
            contains: normalizedPhone.slice(-7), // Match last 7 digits
          },
        },
        select: { id: true },
      });

      if (existingByPhone) {
        return {
          isDuplicate: true,
          duplicateOf: existingByPhone.id,
          matchType: "phone",
        };
      }
    }
  }

  // Priority 3: Check by name + company combination
  if (data.companyName) {
    const existingByNameCompany = await prisma.contact.findFirst({
      where: {
        firstName: { equals: data.firstName, mode: "insensitive" },
        lastName: { equals: data.lastName, mode: "insensitive" },
        company: {
          name: { equals: data.companyName, mode: "insensitive" },
        },
      },
      select: { id: true },
    });

    if (existingByNameCompany) {
      return {
        isDuplicate: true,
        duplicateOf: existingByNameCompany.id,
        matchType: "name_company",
      };
    }
  }

  return { isDuplicate: false };
}

export async function checkDuplicatesBatch(
  rows: Array<{
    rowNumber: number;
    email?: string;
    phone?: string;
    firstName: string;
    lastName: string;
    companyName?: string;
  }>
): Promise<Map<number, DuplicateCheckResult>> {
  const results = new Map<number, DuplicateCheckResult>();

  // Batch check emails
  const emails = rows
    .filter((r) => r.email)
    .map((r) => r.email as string);

  if (emails.length > 0) {
    const existingByEmails = await prisma.contact.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    });

    const emailMap = new Map(existingByEmails.map((c) => [c.email!, c.id]));

    for (const row of rows) {
      if (row.email && emailMap.has(row.email)) {
        results.set(row.rowNumber, {
          isDuplicate: true,
          duplicateOf: emailMap.get(row.email),
          matchType: "email",
        });
      }
    }
  }

  // For rows not yet marked as duplicates, check individually
  for (const row of rows) {
    if (!results.has(row.rowNumber)) {
      const result = await checkDuplicate({
        email: row.email,
        phone: row.phone,
        firstName: row.firstName,
        lastName: row.lastName,
        companyName: row.companyName,
      });
      results.set(row.rowNumber, result);
    }
  }

  return results;
}
