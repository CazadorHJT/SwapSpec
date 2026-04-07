"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const initials = user.email.slice(0, 2).toUpperCase();
  const accountLabel =
    user.account_type === "professional"
      ? "Pro"
      : user.account_type === "hobbyist"
        ? "Hobbyist"
        : "Free";

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className="text-xs font-bold"
          style={{
            background: "oklch(0.20 0.04 245)",
            color: "oklch(0.75 0.12 245)",
            border: "1px solid oklch(0.35 0.08 245)",
          }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-tight text-foreground/80">
          {user.email}
        </p>
        <p
          className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "oklch(0.65 0.18 245)" }}
        >
          {accountLabel}
        </p>
      </div>

      <button
        onClick={() => {
          logout();
          router.push("/login");
        }}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
