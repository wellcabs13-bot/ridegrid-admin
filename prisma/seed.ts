import "dotenv/config";

import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const email = "admin@ridegrid.in";

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("✅ Super Admin already exists.");
    return;
  }

  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  await prisma.user.create({
    data: {
      name: "RideGrid Super Admin",
      email: email,
      mobile: "9999999999",
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });

  console.log("🎉 Super Admin created successfully.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });