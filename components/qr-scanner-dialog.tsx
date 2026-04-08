"use client";

import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Camera, ScanLine } from "lucide-react";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrScannerDialog({ open, onOpenChange }: QrScannerDialogProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (open && !isProcessing) {
      setHasError(false);
      const startScanner = async () => {
        try {
          const { Html5Qrcode } = await import("html5-qrcode");
          const html5QrCode = new Html5Qrcode("qr-reader");
          scannerRef.current = html5QrCode as any;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            onScanSuccess,
            onScanFailure
          );
          
          // Memperbaiki efek mirror yang di inject otomatis oleh library
          const videoElement = document.querySelector("#qr-reader video") as HTMLVideoElement;
          if (videoElement) {
            videoElement.style.transform = "none";
          }
        } catch (err) {
          console.error("Gagal memulai kamera", err);
          setHasError(true);
        }
      };

      // Delay sedikit agar DOM div#qr-reader selesai dirender
      const timeoutId = setTimeout(startScanner, 150);

      return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          }).catch(console.error);
        }
      };
    } else {
      // Jika dialog ditutup
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        }).catch(console.error);
      }
    }
  }, [open, isProcessing]);

  const onScanSuccess = (decodedText: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    let assetId = decodedText;

    if (decodedText.includes("/assets/")) {
      const parts = decodedText.split("/assets/");
      if (parts.length > 1) {
        assetId = parts[1].split("/")[0];
      }
    }

    if (assetId && assetId.trim() !== "") {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        }).catch(console.error);
      }

      toast.success("Aset terdeteksi. Mengarahkan...");
      onOpenChange(false);

      setTimeout(() => {
        router.push(`/assets/${assetId}`);
        setIsProcessing(false);
      }, 500);
    } else {
      toast.error("Format QR tidak valid.");
      setIsProcessing(false);
    }
  };

  const onScanFailure = () => {
    // Abaikan gagal scan reguler
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!isProcessing) onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-primary" />
            Scan QR Code Aset
          </DialogTitle>
          <DialogDescription>
            Arahkan kamera tepat ke QR Code yang ada di fisik aset.
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex flex-col items-center justify-center p-6 bg-slate-950/5">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-16">
              <div className="relative">
                <ScanLine className="size-16 text-primary" />
                <Loader2 className="absolute top-0 left-0 size-16 text-primary animate-spin opacity-50" />
              </div>
              <p className="font-medium animate-pulse text-primary">Memproses kode...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground">
              <Camera className="size-12 opacity-20" />
              <p>Tidak dapat mengakses kamera.<br />Pastikan izin kamera diberikan.</p>
            </div>
          ) : (
            <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl bg-black/90 ring-4 ring-primary/20">
              {/* Overlay Laser Animasi Keren */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                {/* Scanner Frame Corners */}
                <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />
                
                {/* Animasi Laser Penanda Scan */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-linear-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan-line" />
              </div>

              {/* Kamera Container */}
              <div 
                id="qr-reader" 
                className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" 
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
