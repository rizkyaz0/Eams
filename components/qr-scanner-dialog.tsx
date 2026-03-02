"use client";

import { useEffect, useState } from "react";
// @ts-ignore
import { Html5QrcodeScanner } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrScannerDialog({ open, onOpenChange }: QrScannerDialogProps) {
  const router = useRouter();
  const [scanner, setScanner] = useState<any>(null);

  useEffect(() => {
    if (open) {
      // Initialize scanner with a slight delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        try {
          const qrScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);

          qrScanner.render(onScanSuccess, onScanFailure);
          setScanner(qrScanner);
        } catch (e) {
          console.error("Failed to init scanner", e);
        }
      }, 100);

      return () => {
        clearTimeout(timeout);
        if (scanner) {
          try {
            scanner.clear().catch((err: any) => console.error("Failed to clear scanner", err));
          } catch (e) {
            // ignore
          }
        }
      };
    } else {
      if (scanner) {
        try {
          scanner.clear().catch((err: any) => console.error("Failed to clear scanner", err));
          setScanner(null);
        } catch (e) {
          // ignore
        }
      }
    }
  }, [open]);

  const onScanSuccess = (decodedText: string, decodedResult: any) => {
    // Handle the scanned code
    console.log(`Code matched = ${decodedText}`, decodedResult);

    let assetId = decodedText;

    try {
      if (decodedText.includes("/assets/")) {
        const parts = decodedText.split("/assets/");
        if (parts.length > 1) {
          assetId = parts[1];
        }
      }

      onOpenChange(false); // Close dialog
      router.push(`/assets/${assetId}`);
      toast.success("Asset found via QR");
    } catch (e) {
      toast.error("Invalid QR Code");
    }
  };

  const onScanFailure = (error: any) => {
    // handle scan failure, usually better to ignore and keep scanning.
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Asset QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <div className="relative w-full aspect-square max-w-[300px] overflow-hidden rounded-xl border-2 border-primary/20 bg-black">
            <div id="reader" className="w-full h-full scale-110"></div>

            {/* Visual Scan Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="size-48 border-2 border-primary rounded-lg relative">
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 size-4 border-t-4 border-l-4 border-primary rounded-tl-sm"></div>
                <div className="absolute -top-1 -right-1 size-4 border-t-4 border-r-4 border-primary rounded-tr-sm"></div>
                <div className="absolute -bottom-1 -left-1 size-4 border-b-4 border-l-4 border-primary rounded-bl-sm"></div>
                <div className="absolute -bottom-1 -right-1 size-4 border-b-4 border-r-4 border-primary rounded-br-sm"></div>

                {/* Scanning Line Animation */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/50 shadow-[0_0_8px_rgba(var(--primary),0.8)] animate-scan-line"></div>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center space-y-1">
            <p className="font-medium">Align QR Code within frame</p>
            <p className="text-sm text-muted-foreground">Scanning will start automatically</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
