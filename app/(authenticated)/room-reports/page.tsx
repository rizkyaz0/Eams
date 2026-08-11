import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { RoomReportsTable } from "@/components/room-reports-table";
import { CreateRoomReportDialog } from "@/components/create-room-report-dialog";
import { redirect } from "next/navigation";

export default async function RoomReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [reports, locations] = await Promise.all([
    prisma.roomConditionReport.findMany({
      include: {
        location: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Laporan Kondisi Ruangan</h1>
        <CreateRoomReportDialog locations={locations} />
      </div>
      <RoomReportsTable data={reports} />
    </div>
  );
}