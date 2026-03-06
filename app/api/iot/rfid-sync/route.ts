import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * Enterprise IoT Endpoint:
 * This endpoint simulates a webhook receiver for bulk hardware RFID/BLE beacon scanners.
 * An antenna situated at an office door / warehouse gate would hit this API with array of EPC strings.
 */
export async function POST(request: NextRequest) {
  try {
    // In actual production, we would validate a Bearer/API Key here.
    const body = await request.json();
    const { readerGatewayId, currentScannerLocationId, rfidTags } = body;

    // Validate payload shape
    if (!currentScannerLocationId || !Array.isArray(rfidTags)) {
      return errorResponse("Invalid IoT payload. Expected 'currentScannerLocationId' and an array of 'rfidTags'.", 400);
    }

    if (rfidTags.length === 0) {
      return successResponse({ scanned: 0, alertsTriggered: 0 }, "Empty tags payload");
    }

    // Query massive batch of assets based on embedded RFID/EPC data (instead of tag number)
    const scannedAssets = await prisma.asset.findMany({
      where: {
        rfidData: {
          in: rfidTags,
        },
      },
      select: {
        id: true,
        locationId: true,
        tagNumber: true,
        name: true,
      },
    });

    if (scannedAssets.length === 0) {
      return successResponse({ scanned: 0, alertsTriggered: 0 }, "No known internal assets matched the scanned physical RFID signatures.");
    }

    let alertsTriggered = 0;
    const newAlerts = [];

    // Compare Geospatial Rules
    for (const asset of scannedAssets) {
      // If the asset's system location (last BAST) does NOT match the physical scanner's location...
      if (asset.locationId !== currentScannerLocationId) {
        // Check if there's already an active (unresolved) alert for this asset to avoid spamming db
        // if the reader reads 100 times a second.
        const pendingAlert = await prisma.assetAlert.findFirst({
          where: {
            assetId: asset.id,
            resolved: false,
            type: "LOC_MISMATCH",
          },
        });

        if (!pendingAlert) {
          newAlerts.push({
            assetId: asset.id,
            type: "LOC_MISMATCH",
            description: `[IoT Gate: ${readerGatewayId || "Unknown"}]: Deteksi fisik ilegal. Sistem mencatat aset di lokasi ID (${asset.locationId || "Null"}), namun terdeteksi di lokasi ID (${currentScannerLocationId}).`,
          });
          alertsTriggered++;
        }
      }
    }

    // Bulk execute alerts
    if (newAlerts.length > 0) {
      await prisma.assetAlert.createMany({
        data: newAlerts,
      });
    }

    return successResponse(
      {
        tagsSubmitted: rfidTags.length,
        assetsIdentified: scannedAssets.length,
        alertsTriggered,
      },
      "Geospatial IoT RFID Sync batch executed successfully.",
    );
  } catch (error: any) {
    console.error("IoT RFID Sync Runtime Error:", error);
    return errorResponse("Enterprise IoT endpoint encountered an error.", 500);
  }
}
