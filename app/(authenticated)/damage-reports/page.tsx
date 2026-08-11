import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { DamageReportsTable } from "@/components/damage-reports-table";
import { CreateDamageReportDialog } from "@/components/create-damage-report-dialog";
import { redirect } from "next/navigation";

export default async function DamageReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [reports, assets] = await Promise.all([
    prisma.assetDamageReport.findMany({
      include: { asset: { select: { name: true, tagNumber: true } }, reportedBy: { select: { fullName: true } }, resolvedBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.asset.findMany({ where: { status: { not: "DISPOSED" } }, select: { id: true, name: true, tagNumber: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Laporan Barang Rusak</h1>
        <CreateDamageReportDialog assets={assets} />
      </div>
      <DamageReportsTable data={reports} />
    </div>
  );
}