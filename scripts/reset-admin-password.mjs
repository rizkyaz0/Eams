// scripts/reset-admin-password.mjs
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Create Prisma Client with direct connection for scripts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function resetAdminPassword() {
  const newPassword = "admin123"; // Password baru
  const email = "admin@kantor.com"; // Email admin

  console.log("🔄 Resetting admin password...");

  try {
    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password di database
    const updatedUser = await prisma.user.update({
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
    await prisma.$disconnect();
  }
}

resetAdminPassword();
