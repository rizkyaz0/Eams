// scripts/reset-admin-password.ts
import "dotenv/config";
import db from "../lib/db";
import bcrypt from "bcryptjs";

async function resetAdminPassword() {
  const newPassword = "admin123"; // Password baru
  const email = "admin@kantor.com"; // Email admin

  console.log("🔄 Resetting admin password...");

  try {
    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password di database
    const updatedUser = await db.user.update({
      where: { email },
      data: { password: hashedPassword },
      select: {
        email: true,
        fullName: true,
        role: true,
      },
    });

    console.log("✅ Password reset successful!");
    console.log("\n📧 User:", updatedUser.email);
    console.log("👤 Name:", updatedUser.fullName);
    console.log("🔑 Role:", updatedUser.role);
    console.log("\n🔐 New credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
  } catch (error) {
    console.error("❌ Error resetting password:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

resetAdminPassword();
