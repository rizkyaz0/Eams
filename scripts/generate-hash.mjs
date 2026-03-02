// scripts/generate-hash.mjs
import bcrypt from "bcryptjs";

const password = "admin123";
const hash = await bcrypt.hash(password, 12);

console.log("🔐 Generated Password Hash:");
console.log("Password:", password);
console.log("\nHash:", hash);
console.log("\n📝 Copy hash di atas dan jalankan query ini di Supabase SQL Editor:");
console.log(`\nUPDATE "User" SET password = '${hash}' WHERE email = 'admin@kantor.com';\n`);
