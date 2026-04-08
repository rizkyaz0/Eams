"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, Printer, ArrowLeft } from "lucide-react";

export default function PrintQRsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetsToPrint();
  }, [searchParams]);

  const fetchAssetsToPrint = async () => {
    setLoading(true);
    try {
      const categoryId = searchParams.get("category");
      const locationId = searchParams.get("location");
      const status = searchParams.get("status");

      // Gunakan limit besar untuk mendapatkan semua sesuai filter
      const params = new URLSearchParams({
        limit: "1000",
        ...(status && status !== "all" && { status }),
        ...(categoryId && categoryId !== "all" && { categoryId }),
        ...(locationId && locationId !== "all" && { locationId }),
      });

      const response = await fetch(`/api/assets?${params}`);
      const data = await response.json();

      if (data.success) {
        setAssets(data.data.assets);
      }
    } catch (error) {
      console.error("Failed to fetch assets for print:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p>Memuat set data aset...</p>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 text-center">
        <p className="text-xl font-semibold">Tidak Ada Aset Ditemukan</p>
        <p className="text-muted-foreground">Sesuaikan filter Anda untuk mencetak QR Code.</p>
        <Button onClick={() => router.back()}>Kembali ke Daftar Aset</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-10">
      <div className="print:hidden border-b bg-background sticky top-0 z-50 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Cetak Massal QR Code Aset</h1>
            <p className="text-sm text-muted-foreground">{assets.length} Aset siap dicetak</p>
          </div>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 size-4" />
          Mulai Mencetak
        </Button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] p-8 shadow-xl mt-8 print:p-0 print:m-0 print:shadow-none text-black">
        <div className="grid grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 justify-items-center">
          {assets.map((asset) => (
            <div 
              key={asset.id} 
              className="flex flex-col items-center justify-center py-2 px-3 bg-white text-black border-2 border-dashed border-gray-400 w-[85mm] h-[45mm] overflow-hidden page-break-inside-avoid"
            >
              <div className="flex w-full overflow-hidden items-center">
                {/* Left Side: QR and Basic Data */}
                <div className="flex flex-col items-center justify-center w-[40%] border-r border-gray-300 pr-2">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/assets/${asset.id}`)}`} 
                    alt="QR" 
                    className="size-[20mm]" 
                  />
                  <p className="text-[10px] mt-1 font-mono font-bold">{asset.tagNumber}</p>
                </div>

                {/* Right Side: Detailed Info */}
                <div className="flex flex-col justify-between w-[60%] pl-3 h-full">
                  <div>
                    <h2 className="text-sm font-bold leading-tight line-clamp-2 uppercase">
                      {asset.name}
                    </h2>
                    <p className="text-[10px] text-gray-600 truncate uppercase tracking-widest mt-0.5">
                      {asset.category?.name || "General"}
                    </p>
                  </div>

                  <div className="mt-auto space-y-1 w-full">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-semibold text-gray-500">Divisi:</span>
                      <span className="text-right truncate max-w-[25mm]">{asset.location?.name || "-"}</span>
                    </div>
                    <div className="flex justify-between items-end border-t border-gray-300 pt-1 mt-1">
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">EAMS V3</span>
                      <span className="text-[9px] font-mono">{asset.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-\\[210mm\\], .max-w-\\[210mm\\] * {
            visibility: visible;
          }
          .max-w-\\[210mm\\] {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            width: 100%;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
}
