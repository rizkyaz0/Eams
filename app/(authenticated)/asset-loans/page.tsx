import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { AssetLoansTable } from "@/components/asset-loans-table";
import { CreateAssetLoanDialog } from "@/components/create-asset-loan-dialog";
import { redirect } from "next/navigation";

export default async function AssetLoansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [loans, assets, users] = await Promise.all([
    prisma.assetLoan.findMany({
      include: { asset: { select: { name: true, tagNumber: true } }, borrower: { select: { fullName: true, email: true } }, approvedBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.asset.findMany({ where: { status: "AVAILABLE" }, select: { id: true, name: true, tagNumber: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, fullName: true, email: true }, orderBy: { fullName: "asc" } }),
  ]);
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Peminjaman Barang</h1>
        <CreateAssetLoanDialog assets={assets} users={users} />
      </div>
      <AssetLoansTable data={loans} />
    </div>
  );
}