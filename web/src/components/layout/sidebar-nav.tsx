"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Cog,
  ArrowLeftRight,
  Upload,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const BLUE = "oklch(0.65 0.18 245)";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/engines", label: "Engines", icon: Cog },
  { href: "/transmissions", label: "Transmissions", icon: ArrowLeftRight },
  { href: "/upload", label: "Upload", icon: Upload },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const allLinks =
    user?.role === "admin"
      ? [...links, { href: "/admin", label: "Admin", icon: Shield }]
      : links;

  return (
    <nav className="flex flex-col gap-0.5">
      {allLinks.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
            style={
              active
                ? {
                    background: "oklch(0.65 0.18 245 / 12%)",
                    color: BLUE,
                  }
                : {
                    color: "oklch(0.65 0 0)",
                  }
            }
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background =
                  "oklch(0.65 0.18 245 / 6%)";
                (e.currentTarget as HTMLElement).style.color =
                  "oklch(0.85 0 0)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = "";
                (e.currentTarget as HTMLElement).style.color =
                  "oklch(0.65 0 0)";
              }
            }}
          >
            {/* Left accent bar */}
            {active && (
              <span
                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                style={{ background: BLUE }}
              />
            )}
            <Icon
              className="h-5 w-5 shrink-0"
              style={{ color: active ? BLUE : undefined }}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
