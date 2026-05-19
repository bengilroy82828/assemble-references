/**
 * Create or promote a user to ADMIN.
 *
 * Usage (locally):
 *   npx tsx scripts/create-admin.ts ben@assemblesolutions.com.au "Ben Roy" "your-strong-password"
 *
 * On Vercel: run via the Vercel CLI (`vercel env pull .env`, then `npx tsx scripts/create-admin.ts ...`)
 * or use Neon's SQL console / Prisma Studio to flip the role to ADMIN on an existing account.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const [email, fullName, password] = process.argv.slice(2);
  if (!email || !fullName || !password) {
    console.error("Usage: tsx scripts/create-admin.ts <email> <full name> <password>");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "ADMIN", fullName, passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Updated existing user "${email}" → ADMIN.`);
  } else {
    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        fullName,
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
      },
    });
    console.log(`Created admin user "${email}".`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
