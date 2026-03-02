import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { LocationsTable } from "@/components/locations-table";
import { redirect } from "next/navigation";

export default async function LocationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const locations = await prisma.location.findMany({
    include: {
      _count: {
        select: { assets: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
      </div>
      <LocationsTable data={locations} />
    </div>
  );
}
