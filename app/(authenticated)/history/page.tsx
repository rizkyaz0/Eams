import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { HistoryClient } from "./history-client";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch recent BASTs
  const recentBasts = await db.bast.findMany({
    take: 100, // Fetch more data for the table
    orderBy: { createdAt: "desc" },
    include: {
      creator: true,
      details: {
        include: {
          asset: true,
        },
      },
    },
  });

  // Fetch recent Maintenances
  const recentMaintenances = await db.maintenance.findMany({
    take: 100, // Fetch more data for the table
    orderBy: { createdAt: "desc" },
    include: {
      asset: true,
    },
  });

  // Normalize and combine into a unified timeline
  const timeline = [
    ...recentBasts.map((bast) => ({
      id: bast.id,
      type: "BAST",
      date: bast.createdAt.toISOString(),
      title: `BAST ${bast.type.replace("_", " ")}: ${bast.bastNumber}`,
      description: `Diserahkan kepada ${bast.recipientName} (${bast.details.length} Aset)`,
      user: bast.creator.fullName,
      status: bast.status,
      link: `/bast/${bast.id}`,
    })),
    ...recentMaintenances.map((maint) => ({
      id: maint.id,
      type: "MAINTENANCE",
      date: maint.createdAt.toISOString(),
      title: `Maintenance on ${maint.asset.name}`,
      description: maint.description,
      user: maint.vendorName || "Internal",
      status: maint.status,
      link: `/maintenance`, // Point to maintenance section
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return <HistoryClient initialData={timeline} />;
}
