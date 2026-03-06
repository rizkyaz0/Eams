/**
 * lib/email.ts
 * Email notification service using Nodemailer.
 * Configure SMTP via environment variables. Works with Gmail, Outlook, Mailtrap, etc.
 *
 * Required .env variables:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-app-password
 *   SMTP_FROM=EAMS System <no-reply@eams.local>
 */

import nodemailer from "nodemailer";

/** Create transporter lazily (only when needed) */
function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[Email] SMTP not configured. Emails will be skipped.");
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.SMTP_FROM || "EAMS System <no-reply@eams.local>";

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Send a plain email. Silently skips if SMTP is not configured.
 */
export async function sendEmail(options: MailOptions): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    await transporter.sendMail({ from: FROM, ...options });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

// ─── Template Helpers ────────────────────────────────────────────────────────

const baseWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; margin:0; padding:0; }
    .container { max-width:600px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08);}
    .header { background:linear-gradient(135deg,#3b82f6,#6366f1); padding:32px; color:#fff; text-align:center; }
    .header h1 { margin:0; font-size:24px; font-weight:700; }
    .body { padding:32px; color:#1f2937; line-height:1.7; }
    .btn { display:inline-block; margin:20px 0; padding:12px 28px; background:#3b82f6; color:#fff !important; border-radius:8px; text-decoration:none; font-weight:600; }
    .footer { padding:20px 32px; text-align:center; font-size:12px; color:#9ca3af; border-top:1px solid #e5e7eb; }
    .badge { display:inline-block; padding:4px 10px; border-radius:99px; font-size:12px; font-weight:600; }
    .badge-warning { background:#fef3c7; color:#92400e; }
    .badge-danger { background:#fee2e2; color:#991b1b; }
    .badge-info { background:#dbeafe; color:#1e40af; }
  </style>
</head>
<body><div class="container">${content}<div class="footer">EAMS — Enterprise Asset Management System · ${new Date().getFullYear()}</div></div></body>
</html>`;

/**
 * BAST pending approval notification (sent to the approver)
 */
export function bastApprovalEmailHtml(opts: { approverName: string; bastNumber: string; creatorName: string; type: string; assetCount: number; bastUrl: string }) {
  return baseWrapper(`
    <div class="header"><h1>📋 BAST Menunggu Persetujuan Anda</h1></div>
    <div class="body">
      <p>Halo, <strong>${opts.approverName}</strong>,</p>
      <p><strong>${opts.creatorName}</strong> telah mengajukan BAST baru yang membutuhkan persetujuan Anda.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px">No. BAST</td><td><strong>${opts.bastNumber}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Tipe</td><td><span class="badge badge-info">${opts.type}</span></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Jumlah Aset</td><td>${opts.assetCount} item</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Diajukan oleh</td><td>${opts.creatorName}</td></tr>
      </table>
      <a href="${opts.bastUrl}" class="btn">Tinjau &amp; Setujui BAST →</a>
      <p style="font-size:13px;color:#6b7280">Jika Anda tidak mengenali permintaan ini, abaikan email ini.</p>
    </div>`);
}

/**
 * AI Predictive Maintenance alert (sent to asset manager / teknisi)
 */
export function maintenancePredictionEmailHtml(opts: { recipientName: string; assetName: string; tagNumber: string; predictedDate: string; confidenceScore: number; assetUrl: string }) {
  const conf = Math.round(opts.confidenceScore * 100);
  const badgeClass = conf > 75 ? "badge-danger" : "badge-warning";
  return baseWrapper(`
    <div class="header" style="background:linear-gradient(135deg,#f59e0b,#ef4444)"><h1>⚠️ Prediksi Kerusakan Aset</h1></div>
    <div class="body">
      <p>Halo, <strong>${opts.recipientName}</strong>,</p>
      <p>Sistem AI EAMS mendeteksi kemungkinan kerusakan pada aset berikut berdasarkan data historis pemeliharaan:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#6b7280;width:160px">Nama Aset</td><td><strong>${opts.assetName}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Tag Number</td><td><code>${opts.tagNumber}</code></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Prediksi Rusak</td><td><strong>${opts.predictedDate}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">AI Confidence</td><td><span class="badge ${badgeClass}">${conf}%</span></td></tr>
      </table>
      <p>Disarankan untuk menjadwalkan pemeriksaan preventif sebelum tanggal prediksi.</p>
      <a href="${opts.assetUrl}" class="btn">Tinjau Aset &amp; Jadwalkan Maintenance →</a>
    </div>`);
}

/**
 * Stock-Take alert — missing asset found during blind audit
 */
export function missingAssetEmailHtml(opts: { recipientName: string; assetName: string; tagNumber: string; stockTakeTitle: string; stockTakeUrl: string }) {
  return baseWrapper(`
    <div class="header" style="background:linear-gradient(135deg,#ef4444,#7c3aed)"><h1>🚨 Aset Hilang Terdeteksi</h1></div>
    <div class="body">
      <p>Halo, <strong>${opts.recipientName}</strong>,</p>
      <p>Dalam sesi Blind Stock-Take "<strong>${opts.stockTakeTitle}</strong>", auditor menandai aset berikut sebagai <span class="badge badge-danger">Tidak Ditemukan</span>:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px">Nama Aset</td><td><strong>${opts.assetName}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Tag Number</td><td><code>${opts.tagNumber}</code></td></tr>
      </table>
      <p>Harap segera melakukan investigasi lapangan atau memperbarui status aset di sistem.</p>
      <a href="${opts.stockTakeUrl}" class="btn">Lihat Laporan Stock-Take →</a>
    </div>`);
}
