"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { acceptInvitation } from "@/server/services/team";
import { ACTIVE_ORG_COOKIE } from "@/server/tenant";
import { prisma } from "@/lib/prisma";

export async function acceptInviteAction(locale: string, token: string): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect(`/${locale}/login`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) redirect(`/${locale}/login`);

  const result = await acceptInvitation(token, user);
  if ("error" in result) redirect(`/${locale}/invite/${token}?error=${result.error}`);

  const jar = await cookies();
  jar.set(ACTIVE_ORG_COOKIE, result.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect(`/${locale}/dashboard`);
}
