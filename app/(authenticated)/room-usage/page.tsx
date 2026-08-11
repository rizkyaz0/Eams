import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { RoomUsageTable } from "@/components/room-usage-table";
import { CreateRoomUsageDialog } from "@/components/create-room-usage-dialog";
import { redirect } from "next/navigation";

export default async function RoomUsagePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [logs, locations] = await Promise.all([
    prisma.roomUsageLog.findMany({
      include: {
        location: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { startTime: "desc" },
    }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Penggunaan Ruangan</h1>
        <CreateRoomUsageDialog locations={locations} />
      </div>
      <RoomUsageTable data={logs} />
    </div>
  );
}