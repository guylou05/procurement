"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/server/auth";
import { createOrganization } from "@/server/services/organization";
import { ACTIVE_ORG_COOKIE } from "@/server/tenant";

const schema = z.object({
  name: z.string().min(1),
  country: z.string().min(2),
  currency: z.string().min(3),
  defaultLocale: z.enum(["en", "fr"]),
  timezone: z.string().optional(),
  industry: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function createOrganizationAction(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/en/login");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    country: formData.get("country"),
    currency: formData.get("currency"),
    defaultLocale: formData.get("defaultLocale"),
    timezone: formData.get("timezone") || undefined,
    industry: formData.get("industry") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
  });
  if (!parsed.success) redirect("../onboarding?error=validation");

  const org = await createOrganization(userId, parsed.data);

  // Set the active-organization cookie (server-set, validated on every request).
  const jar = await cookies();
  jar.set(ACTIVE_ORG_COOKIE, org.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect(`/${parsed.data.defaultLocale}/dashboard`);
}
