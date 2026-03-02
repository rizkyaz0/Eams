"use client";

import React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface AssetLabelProps {
  asset: any;
}

export function AssetLabel({ asset }: AssetLabelProps) {
  if (!asset) return null;

  return (
    <div className="hidden print:flex flex-col items-center justify-center p-4 bg-white text-black border-2 border-dashed border-gray-400 w-[80mm] h-[40mm] mx-auto overflow-hidden">
      <div className="flex w-full overflow-hidden">
        {/* Left Side: QR and Basic Data */}
        <div className="flex flex-col items-center justify-center w-1/3 border-r pr-2 py-2">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/assets/${asset.id}`)}`} alt="Asset QR" className="size-16" />
          <p className="text-[8px] mt-1 font-mono">{asset.tagNumber}</p>
        </div>

        {/* Right Side: Detailed Info */}
        <div className="flex flex-col justify-between w-2/3 pl-3 py-1">
          <div>
            <h2 className="text-xs font-bold truncate uppercase">{asset.name}</h2>
            <p className="text-[9px] text-gray-600 truncate">{asset.category?.name || "General Asset"}</p>
          </div>

          <div className="mt-2 space-y-0.5">
            <div className="flex justify-between text-[8px]">
              <span className="font-semibold">Divisi:</span>
              <span className="truncate">{asset.location?.name || "-"}</span>
            </div>
            <div className="flex justify-between text-[8px]">
              <span className="font-semibold">Tanggal:</span>
              <span>{asset.purchaseDate ? format(new Date(asset.purchaseDate), "dd/MM/yyyy") : "-"}</span>
            </div>
          </div>

          <div className="mt-auto border-t pt-1 flex justify-between items-center w-full">
            <span className="text-[7px] font-bold text-gray-400 uppercase">EAMS INVENTARIS</span>
            <span className="text-[7px] font-mono">{asset.id.slice(-6)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
