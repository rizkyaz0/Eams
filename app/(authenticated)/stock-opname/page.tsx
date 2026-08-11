import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { StockOpnameTable } from "@/components/stock-opname-table";
import { CreateStockOpnameDialog } from "@/components/create-stock-opname-dialog";
import { redirect } from "next/navigation";

export default async function StockOpnamePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sessions = await prisma.stockOpname.findMany({
    include: { createdBy: { select: { fullName: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Stock Opname</h1>
        <CreateStockOpnameDialog />
      </div>
      <StockOpnameTable data={sessions} />
    </div>
  );
}