import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { StockOpnameDetail } from "@/components/stock-opname-detail";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function StockOpnameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const session = await prisma.stockOpname.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      items: {
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              tagNumber: true,
              condition: true,
              location: { select: { name: true } },
            },
          },
        },
        orderBy: { asset: { name: "asc" } },
      },
    },
  });
  if (!session) notFound();
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/stock-opname">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
      <StockOpnameDetail session={session} />
    </div>
  );
}
