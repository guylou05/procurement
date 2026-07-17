import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { SignOutButton } from "@/components/layout/sign-out-button";

export function Topbar({ orgName, userName }: { orgName: string; userName: string }) {
  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b bg-card px-4 lg:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{orgName}</p>
        <p className="truncate text-xs text-muted-foreground">{userName}</p>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <SignOutButton />
      </div>
    </header>
  );
}
