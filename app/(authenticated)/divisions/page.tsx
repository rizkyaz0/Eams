import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { DivisionsTable } from "@/components/divisions-table";
import { redirect } from "next/navigation";

export default async function DivisionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const divisions = await prisma.division.findMany({
    include: {
      _count: {
        select: { users: true, assets: true },
      },
    },
    orderBy: {
      code: "asc",
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Divisi</h1>
      </div>
      <DivisionsTable data={divisions} />
    </div>
  );
}
