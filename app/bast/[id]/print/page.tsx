import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { BastPrintView } from "@/components/bast-print-view";

export default async function BastPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await params;

  const bast = await db.bast.findUnique({
    where: { id: resolvedParams.id },
    include: {
      creator: true,
      approver: true,
      details: {
        include: {
          asset: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  if (!bast) {
    return (
      <div className="flex flex-col items-center justify-center p-24 h-screen text-center bg-white text-black">
        <h1 className="text-2xl font-bold">Document Not Found</h1>
        <p className="mt-2">The BAST document you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <BastPrintView bast={bast} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Automatically trigger print dialog when page loads
            window.onload = function() {
              window.print();
            };
          `,
        }}
      />
    </div>
  );
}
