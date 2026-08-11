import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { ProcurementTable } from "@/components/procurement-table";
import { CreateProcurementDialog } from "@/components/create-procurement-dialog";
import { redirect } from "next/navigation";

export default async function ProcurementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [reqs, maintenances] = await Promise.all([
    prisma.procurementRequest.findMany({
      include: { maintenance: { select: { id: true, description: true, asset: { select: { name: true, tagNumber: true } } } }, requestedBy: { select: { fullName: true } }, approvedBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.maintenance.findMany({ where: { status: { not: "COMPLETED" } }, include: { asset: { select: { name: true, tagNumber: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pengadaan untuk Service</h1>
        <CreateProcurementDialog maintenances={maintenances} />
      </div>
      <ProcurementTable data={reqs} />
    </div>
  );
}