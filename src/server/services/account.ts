import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Account/registration service. Global (pre-tenant) operations: these run before a
 * user has an organization, so they are not tenant-scoped.
 */
export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  locale?: string;
}): Promise<{ id: string } | { error: "EMAIL_TAKEN" }> {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "EMAIL_TAKEN" };

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash,
      locale: input.locale ?? "en",
      preference: { create: { locale: input.locale ?? "en" } },
    },
  });
  return { id: user.id };
}
