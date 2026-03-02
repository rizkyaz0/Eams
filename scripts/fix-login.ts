import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("password123", 12);
  console.log("Updating admin password...");
  try {
    const user = await prisma.user.update({
      where: { email: "admin@eams.com" },
      data: { password },
    });
    console.log(`Password updated for user: ${user.email}`);
  } catch (e) {
    console.error("Error updating password:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
