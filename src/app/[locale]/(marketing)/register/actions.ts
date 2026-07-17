"use server";

import { z } from "zod";
import { registerUser } from "@/server/services/account";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  locale: z.string().default("en"),
});

export type RegisterState = { error?: string; success?: boolean };

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) {
    return { error: "validation" };
  }

  const result = await registerUser(parsed.data);
  if ("error" in result) {
    return { error: "EMAIL_TAKEN" };
  }
  return { success: true };
}
