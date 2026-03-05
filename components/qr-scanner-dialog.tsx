"use client";

import { useEffect, useState, useRef } from "react";
// @ts-ignore
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrScannerDialog({ open, onOpenChange }: QrScannerDialogProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (open && !isProcessing) {
      // Small delay to ensure the DOM element "reader" is fully rendered
      const timeoutId = setTimeout(() => {
        if (!scannerRef.current) {
          try {
            const scanner = new Html5QrcodeScanner(
              "reader",
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
              },
              false,
            );

            scanner.render(onScanSuccess, onScanFailure);
            scannerRef.current = scanner;
          } catch (err) {
            console.error("Failed to initialize scanner", err);
          }
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
          scannerRef.current = null;
        }
      };
    } else {
      // Cleanup when dialog closes
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }
  }, [open, isProcessing]);

  const onScanSuccess = (decodedText: string) => {
    if (isProcessing) return; // Prevent multiple rapid scans

    setIsProcessing(true);
    let assetId = decodedText;

    // Check if the QR code string is a URL containing /assets/
    if (decodedText.includes("/assets/")) {
      const parts = decodedText.split("/assets/");
      if (parts.length > 1) {
        assetId = parts[1].split("/")[0]; // Extract ID taking care of trailing slashes or queries
      }
    }

    if (assetId && assetId.trim() !== "") {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }

      toast.success("Asset detected. Redirecting...");
      onOpenChange(false);

      // Delay navigation slightly to allow UI to update (dialog closes, toast shows)
      setTimeout(() => {
        router.push(`/assets/${assetId}`);
        setIsProcessing(false);
      }, 500);
    } else {
      toast.error("Invalid QR format. Could not extract Asset ID.");
      setIsProcessing(false);
    }
  };

  const onScanFailure = (error: any) => {
    // We intentionally ignore scanning failures (like when the camera is pointing at nowhere)
    // to avoid flooding the console/UI. `html5-qrcode` fires this many times per second.
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!isProcessing) onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Asset QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <Loader2 className="size-10 text-primary animate-spin" />
              <p className="font-medium animate-pulse">Processing code...</p>
            </div>
          ) : (
            <div className="relative w-full aspect-square max-w-[300px] overflow-hidden rounded-xl border-2 border-primary/20 bg-black">
              {/* html5-qrcode mounts inside this div */}
              <div id="reader" className="w-full h-full [&_video]:object-cover" />
            </div>
          )}

          <div className="mt-6 text-center space-y-1">
            <p className="font-medium">Align QR Code within the frame.</p>
            <p className="text-sm text-muted-foreground">Make sure you allow camera permissions in your browser.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
