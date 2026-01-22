import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";

export async function GET(request: NextRequest) {
  try {
    const business = await getCurrentBusiness(request);

    // Build business scope filter
    let businessFilter = {};
    if (business) {
      const isParent = !business.parentId;
      businessFilter = await buildBusinessScopeFilter(business.id, isParent);
    }

    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch all stats in parallel
    const [
      totalDealsWon,
      lastMonthDealsWon,
      activeDeals,
      dealsClosingThisMonth,
      newContactsThisMonth,
      lastMonthContacts,
      totalContacts,
      wonDeals,
      pipelineStages,
    ] = await Promise.all([
      // Total revenue (won deals this month)
      prisma.deal.aggregate({
        where: {
          ...businessFilter,
          stage: "CLOSED_WON",
          updatedAt: { gte: startOfMonth },
        },
        _sum: { value: true },
      }),
      // Last month revenue
      prisma.deal.aggregate({
        where: {
          ...businessFilter,
          stage: "CLOSED_WON",
          updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { value: true },
      }),
      // Active deals count
      prisma.deal.count({
        where: {
          ...businessFilter,
          stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
        },
      }),
      // Deals closing this month
      prisma.deal.count({
        where: {
          ...businessFilter,
          stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
          expectedCloseDate: {
            gte: startOfMonth,
            lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          },
        },
      }),
      // New contacts this month
      prisma.contact.count({
        where: {
          ...businessFilter,
          createdAt: { gte: startOfMonth },
        },
      }),
      // Last month contacts
      prisma.contact.count({
        where: {
          ...businessFilter,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      // Total contacts for conversion rate
      prisma.contact.count({ where: businessFilter }),
      // Won deals for conversion rate
      prisma.deal.count({
        where: {
          ...businessFilter,
          stage: "CLOSED_WON",
        },
      }),
      // Pipeline stages
      prisma.pipelineStage.findMany({
        where: {
          pipeline: {
            ...businessFilter,
            isActive: true,
            isDefault: true,
          },
        },
        orderBy: { position: "asc" },
        include: {
          _count: {
            select: { deals: true },
          },
          deals: {
            where: {
              stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
            },
            select: { value: true },
          },
        },
      }),
    ]);

    // Calculate metrics
    const totalRevenue = Number(totalDealsWon._sum.value || 0);
    const lastMonthRevenue = Number(lastMonthDealsWon._sum.value || 0);
    const revenueTrend = lastMonthRevenue > 0
      ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    const contactsTrend = lastMonthContacts > 0
      ? ((newContactsThisMonth - lastMonthContacts) / lastMonthContacts) * 100
      : 0;

    const conversionRate = totalContacts > 0
      ? (wonDeals / totalContacts) * 100
      : 0;

    // Build pipeline data
    const pipeline = pipelineStages
      .filter(stage => !stage.isClosed)
      .slice(0, 4)
      .map(stage => ({
        stage: stage.name,
        count: stage._count.deals,
        value: stage.deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0),
      }));

    // Check if we have any real data
    const hasData = totalRevenue > 0 || activeDeals > 0 || newContactsThisMonth > 0 || totalContacts > 0;

    if (!hasData) {
      return NextResponse.json({
        success: false,
        message: "No data available",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        activeDeals,
        dealsClosingThisMonth,
        newContacts: newContactsThisMonth,
        conversionRate,
        revenueTrend,
        dealsTrend: 0, // Would need historical data to calculate
        contactsTrend,
        conversionTrend: 0, // Would need historical data to calculate
        pipeline,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch dashboard stats" } },
      { status: 500 }
    );
  }
}
