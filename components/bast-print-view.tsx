import React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface BastPrintProps {
  bast: any;
}

export function BastPrintView({ bast }: BastPrintProps) {
  if (!bast) return null;

  return (
    <div className="hidden print:block p-12 bg-white text-black min-h-screen font-serif">
      {/* Header / Kop Surat */}
      <div className="flex items-center justify-between border-b-4 border-double border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="size-16 bg-black rounded flex items-center justify-center text-white font-bold text-2xl">EA</div>
          <div className="text-left">
            <h2 className="text-xl font-bold uppercase tracking-tight">Enterprise Asset Management System</h2>
            <p className="text-xs">Jl. Protokol No. 123, Jakarta, Indonesia</p>
            <p className="text-[10px] text-gray-500 italic">Automated Asset & Inventory Management Solution</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-lg font-bold uppercase leading-tight">Berita Acara</h1>
          <h2 className="text-sm font-semibold uppercase opacity-80">{bast.type.replace(/_/g, " ")}</h2>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-black uppercase underline decoration-2 underline-offset-4">Berita Acara Serah Terima</h1>
        <p className="text-md font-medium mt-1">
          Nomor: <span className="font-mono">{bast.bastNumber}</span>
        </p>
      </div>

      {/* Opening Statement */}
      <div className="mb-8 leading-relaxed">
        <p className="text-justify">
          Pada hari ini, <span className="font-bold uppercase">{format(new Date(bast.createdAt), "EEEE", { locale: id })}</span>, tanggal <span className="font-bold">{format(new Date(bast.createdAt), "dd", { locale: id })}</span>
          bulan <span className="font-bold uppercase">{format(new Date(bast.createdAt), "MMMM", { locale: id })}</span>
          tahun <span className="font-bold">{format(new Date(bast.createdAt), "yyyy", { locale: id })}</span>, telah dilakukan penyerahan aset/barang inventaris antara:
        </p>

        <div className="mt-8 space-y-6">
          {/* Pihak Pertama */}
          <div className="grid grid-cols-[180px_20px_1fr] gap-y-1">
            <span className="font-bold">Nama</span>
            <span>:</span>
            <span className="uppercase font-semibold">{bast.creator?.fullName || "..."}</span>
            <span className="font-bold">Jabatan</span>
            <span>:</span>
            <span>Staf Administrasi Aset</span>
            <span className="font-bold">Status</span>
            <span>:</span>
            <span className="italic">
              Selanjutnya disebut <span className="font-bold">PIHAK PERTAMA</span>
            </span>
          </div>

          {/* Pihak Kedua */}
          <div className="grid grid-cols-[180px_20px_1fr] gap-y-1">
            <span className="font-bold">Nama</span>
            <span>:</span>
            <span className="uppercase font-semibold">{bast.recipientName}</span>
            <span className="font-bold">Jabatan</span>
            <span>:</span>
            <span>{bast.recipientPosition || "-"}</span>
            <span className="font-bold">Status</span>
            <span>:</span>
            <span className="italic">
              Selanjutnya disebut <span className="font-bold">PIHAK KEDUA</span>
            </span>
          </div>
        </div>

        <p className="mt-8 text-justify">PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA telah menerima dari PIHAK PERTAMA barang/aset dalam kondisi sebagaimana tercantum dalam daftar berikut:</p>
      </div>

      {bast.type === "ASSIGNMENT" && (bast.loanStartDate || bast.loanEndDate || bast.description) && (
        <div className="mb-6 border border-black p-4 text-sm">
          <h3 className="font-bold uppercase underline mb-2">Detail Peminjaman:</h3>
          <div className="grid grid-cols-[150px_20px_1fr] gap-y-1">
            {bast.loanStartDate && (
              <>
                <span className="font-bold">Tanggal Mulai</span>
                <span>:</span>
                <span>{format(new Date(bast.loanStartDate), "dd MMMM yyyy", { locale: id })}</span>
              </>
            )}
            {bast.loanEndDate && (
              <>
                <span className="font-bold">Batas Pengembalian</span>
                <span>:</span>
                <span className="text-red-700 font-bold">{format(new Date(bast.loanEndDate), "dd MMMM yyyy", { locale: id })}</span>
              </>
            )}
            {bast.description && (
              <>
                <span className="font-bold">Tujuan / Catatan</span>
                <span>:</span>
                <span>{bast.description}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table Itemized Assets */}
      <div className="mb-10 overflow-hidden rounded-sm border border-black">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-black">
              <th className="border-r border-black p-2 text-center w-12 text-xs font-bold uppercase">No</th>
              <th className="border-r border-black p-2 text-left text-xs font-bold uppercase">Identitas / Nama Barang</th>
              <th className="border-r border-black p-2 text-center text-xs font-bold uppercase">Tag / Seri</th>
              <th className="border-r border-black p-2 text-center text-xs font-bold uppercase w-32">Kondisi</th>
              <th className="p-2 text-left text-xs font-bold uppercase">Keterangan</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {bast.details?.map((item: any, index: number) => (
              <tr key={item.id} className="border-b border-gray-300 last:border-0">
                <td className="border-r border-black p-2 text-center">{index + 1}</td>
                <td className="border-r border-black p-2 font-semibold">{item.asset.name}</td>
                <td className="border-r border-black p-2 text-center font-mono">{item.asset.tagNumber}</td>
                <td className="border-r border-black p-2 text-center italic">{item.conditionAfter}</td>
                <td className="p-2 truncate max-w-[150px]">{item.description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Closing & Signatures */}
      <div className="grid grid-cols-2 gap-12 text-center mt-auto pb-12">
        <div className="flex flex-col">
          <p className="flex-1 italic text-xs mb-16 text-gray-500">Pihak yang menyerahkan,</p>
          <p className="font-bold uppercase underline decoration-1 underline-offset-4 tracking-wider">{bast.creator?.fullName || "..."}</p>
          <p className="text-[10px] mt-1 uppercase opacity-60 font-bold">PIHAK PERTAMA</p>
        </div>
        <div className="flex flex-col">
          <p className="flex-1 italic text-xs mb-16 text-gray-500">Pihak yang menerima,</p>
          <p className="font-bold uppercase underline decoration-1 underline-offset-4 tracking-wider">{bast.recipientName}</p>
          <p className="text-[10px] mt-1 uppercase opacity-60 font-bold">PIHAK KEDUA</p>
        </div>
      </div>

      {/* Approval Section */}
      {bast.approverName && (
        <div className="text-center mt-12 w-full flex flex-col items-center">
          <div className="w-64 border-t border-black pt-4">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-12">Mengetahui/Menyetujui,</p>
            <p className="font-bold uppercase underline decoration-1 underline-offset-4 tracking-wider">{bast.approverName}</p>
            <p className="text-[10px] mt-1 uppercase opacity-60 font-bold">Otorisasi / Manager</p>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="mt-12 text-[8px] text-gray-400 italic text-center w-full border-t pt-2">Dokumen ini dihasilkan secara otomatis oleh Enterprise Asset Management System (EAMS) - {format(new Date(), "yyyy")}</div>
    </div>
  );
}
