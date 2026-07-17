import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Locale routing middleware. Auth protection for app routes is enforced in the
// (app) layout via requireAuth(), and every mutation re-checks authorization
// server-side — middleware never carries authorization decisions.
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
