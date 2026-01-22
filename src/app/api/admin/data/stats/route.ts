import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCleanupStats } from "@/lib/data-management/cleanup";

// GET /api/admin/data/stats - Get database statistics
export async function GET() {
  try {
    // Get cleanup stats (record counts)
    const cleanupStats = await getCleanupStats();

    // Get additional database statistics
    const [
      totalUsers,
      activeUsers,
      totalContacts,
      totalCompanies,
      totalDeals,
      totalProducts,
      totalQuotes,
      recentBackup,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.contact.count(),
      prisma.company.count(),
      prisma.deal.count(),
      prisma.product.count(),
      prisma.quote.count(),
      prisma.databaseBackup.findFirst({
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        core: {
          users: {
            total: totalUsers,
            active: activeUsers,
          },
          contacts: totalContacts,
          companies: totalCompanies,
          deals: totalDeals,
          products: totalProducts,
          quotes: totalQuotes,
        },
        maintenance: cleanupStats,
        lastBackup: recentBackup
          ? {
              id: recentBackup.id,
              filename: recentBackup.filename,
              completedAt: recentBackup.completedAt,
              fileSize: recentBackup.fileSize,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to get data stats:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to get statistics" } },
      { status: 500 }
    );
  }
}
