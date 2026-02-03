import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SearchResult {
  entity: string;
  id: string;
  title: string;
  subtitle: string | null;
  link: string;
}

// GET /api/search - Global search across all entities
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || ""; // Allow empty query
    const entity = searchParams.get("entity");
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20");

    const results: SearchResult[] = [];
    const hasQuery = query.length > 0;

    // Search contacts
    if (!entity || entity === "contacts") {
      const contacts = await prisma.contact.findMany({
        where: hasQuery ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
          ],
        } : undefined,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      results.push(
        ...contacts.map((c) => ({
          entity: "contacts",
          id: c.id,
          title: `${c.firstName} ${c.lastName}`,
          subtitle: c.company?.name || c.email,
          link: `/contacts/${c.id}`,
        }))
      );
    }

    // Search companies
    if (!entity || entity === "companies") {
      const companies = await prisma.company.findMany({
        where: hasQuery ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { website: { contains: query, mode: "insensitive" } },
            { industry: { contains: query, mode: "insensitive" } },
          ],
        } : undefined,
        select: {
          id: true,
          name: true,
          industry: true,
          website: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      results.push(
        ...companies.map((c) => ({
          entity: "companies",
          id: c.id,
          title: c.name,
          subtitle: c.industry || c.website,
          link: `/companies/${c.id}`,
        }))
      );
    }

    // Search deals
    if (!entity || entity === "deals") {
      const deals = await prisma.deal.findMany({
        where: hasQuery ? {
          OR: [{ title: { contains: query, mode: "insensitive" } }],
        } : undefined,
        select: {
          id: true,
          title: true,
          value: true,
          stage: true,
          company: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      results.push(
        ...deals.map((d) => ({
          entity: "deals",
          id: d.id,
          title: d.title,
          subtitle: d.company?.name || `$${d.value?.toLocaleString() || 0}`,
          link: `/deals/${d.id}`,
        }))
      );
    }

    // Search quotes
    if (!entity || entity === "quotes") {
      const quotes = await prisma.quote.findMany({
        where: hasQuery ? {
          OR: [
            { quoteNumber: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
          ],
        } : undefined,
        select: {
          id: true,
          quoteNumber: true,
          title: true,
          status: true,
          total: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      results.push(
        ...quotes.map((q) => ({
          entity: "quotes",
          id: q.id,
          title: q.title || q.quoteNumber,
          subtitle: `${q.quoteNumber} - $${q.total?.toLocaleString() || 0}`,
          link: `/quotes/${q.id}`,
        }))
      );
    }

    // Search tasks
    if (!entity || entity === "tasks") {
      const tasks = await prisma.task.findMany({
        where: hasQuery ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        } : undefined,
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      results.push(
        ...tasks.map((t) => ({
          entity: "tasks",
          id: t.id,
          title: t.title,
          subtitle: t.status,
          link: `/tasks?id=${t.id}`,
        }))
      );
    }

    // Search products
    if (!entity || entity === "products") {
      const products = await prisma.product.findMany({
        where: hasQuery ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        } : undefined,
        select: {
          id: true,
          name: true,
          sku: true,
          basePrice: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      results.push(
        ...products.map((p) => ({
          entity: "products",
          id: p.id,
          title: p.name,
          subtitle: `${p.sku} - $${p.basePrice?.toLocaleString() || 0}`,
          link: `/products/${p.id}`,
        }))
      );
    }

    // Log search history if userId provided and there's a query
    if (userId && hasQuery) {
      await prisma.searchHistory.create({
        data: {
          userId,
          query,
          entity,
          resultsCount: results.length,
        },
      });
    }

    // Sort by relevance (entity priority)
    const entityPriority: Record<string, number> = {
      contacts: 1,
      companies: 2,
      deals: 3,
      quotes: 4,
      tasks: 5,
      products: 6,
    };

    results.sort((a, b) => {
      const priorityDiff = entityPriority[a.entity] - entityPriority[b.entity];
      if (priorityDiff !== 0) return priorityDiff;
      // Secondary sort by title match (only if query exists)
      if (hasQuery) {
        const aMatch = a.title.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
        const bMatch = b.title.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
        return aMatch - bMatch;
      }
      return 0;
    });

    return NextResponse.json({
      success: true,
      data: results.slice(0, limit),
      total: results.length,
    });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { success: false, error: { code: "SEARCH_ERROR", message: "Search failed" } },
      { status: 500 }
    );
  }
}
