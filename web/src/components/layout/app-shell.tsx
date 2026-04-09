"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Plus,
  LayoutDashboard,
  Car,
  Cog,
  ArrowLeftRight,
  Upload,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { TopBarTabsProvider, useTopBarTabs } from "@/lib/top-bar-context";

const NAV_ICONS = [
  { href: "/dashboard", icon: LayoutDashboard },
  { href: "/vehicles", icon: Car },
  { href: "/engines", icon: Cog },
  { href: "/transmissions", icon: ArrowLeftRight },
  { href: "/upload", icon: Upload },
];

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "My Builds",
  "/vehicles": "Vehicles",
  "/engines": "Engines",
  "/transmissions": "Transmissions",
  "/upload": "Upload",
  "/builds/new": "New Build",
  "/admin": "Admin",
};

function usePageTitle(): string {
  const pathname = usePathname();
  for (const [prefix, title] of Object.entries(ROUTE_TITLES)) {
    if (pathname.startsWith(prefix)) return title;
  }
  return "";
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = usePageTitle();
  const { user } = useAuth();
  const { tabs, activeTab, setActiveTab } = useTopBarTabs();
  const hasTabs = tabs.length > 0;

  const allNavIcons =
    user?.role === "admin"
      ? [...NAV_ICONS, { href: "/admin", icon: Shield }]
      : NAV_ICONS;

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Thin icon sidebar — always visible on desktop ─────────── */}
      <div
        className="group/sidebar relative z-30 hidden w-14 shrink-0 flex-col md:flex"
        style={{
          background: "var(--color-sidebar)",
          borderRight:
            "1px solid color-mix(in oklch, var(--color-border) 50%, transparent)",
        }}
      >
        {/* Brand row: "S" visible in thin state */}
        <div className="flex h-14 shrink-0 items-center justify-center overflow-hidden border-b">
          <span
            className="text-xl font-bold"
            style={{ color: "oklch(0.65 0.18 245)" }}
          >
            S
          </span>
        </div>

        {/* Icon strip: icons positioned at pl-6 (24px) to match expanded nav */}
        <div className="flex flex-1 flex-col gap-0.5 py-2">
          {allNavIcons.map(({ href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center rounded-lg py-2.5 pl-6 pr-3 transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="h-5 w-5 shrink-0" />
              </Link>
            );
          })}
        </div>

        {/* User avatar pinned to bottom */}
        <div className="flex shrink-0 justify-center border-t py-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-[10px] font-bold dark:bg-[oklch(0.20_0.04_245)] dark:text-[oklch(0.75_0.12_245)] dark:border-[oklch(0.35_0.08_245)] bg-transparent text-foreground border border-foreground/30">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* ── Full sidebar overlay (on hover of group/sidebar) ──── */}
        <div
          className="invisible absolute left-0 top-0 flex h-full w-56 flex-col opacity-0 shadow-xl transition-all duration-200 group-hover/sidebar:visible group-hover/sidebar:opacity-100"
          style={{
            background: "var(--color-sidebar)",
            borderRight:
              "1px solid color-mix(in oklch, var(--color-border) 50%, transparent)",
          }}
        >
          {/* Full brand header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <span className="text-lg font-bold leading-none tracking-tight">
              <span style={{ color: "oklch(0.65 0.18 245)" }}>Swap</span>
              <span className="text-foreground">Spec</span>
            </span>
            <ThemeToggle />
          </div>

          {/* Nav with labels — px-3 container so icons sit at 24px (matching thin strip) */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <SidebarNav />
          </div>

          {/* User menu anchored at bottom */}
          <div className="shrink-0 border-t border-border/30 p-4">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* ── Main content column ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop top bar */}
        <header className="hidden h-14 shrink-0 items-center border-b px-6 md:flex">
          {hasTabs ? (
            <>
              <div className="flex items-center gap-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className="relative h-14 px-4 text-sm font-medium transition-colors"
                      style={{
                        color: isActive
                          ? "oklch(0.65 0.18 245)"
                          : "var(--color-muted-foreground)",
                        borderBottom: isActive
                          ? "2px solid oklch(0.65 0.18 245)"
                          : "2px solid transparent",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="ml-auto">
                <Link href="/builds/new">
                  <Button
                    size="sm"
                    style={{
                      background: "oklch(0.65 0.18 245)",
                      color: "#fff",
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    New Build
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="flex-1 text-base font-bold">{pageTitle}</h2>
              <Link href="/builds/new">
                <Button
                  size="sm"
                  style={{
                    background: "oklch(0.65 0.18 245)",
                    color: "#fff",
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Build
                </Button>
              </Link>
            </>
          )}
        </header>

        {/* Mobile header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 p-0"
              style={{ background: "var(--color-sidebar)" }}
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-14 items-center justify-between border-b px-4">
                <span className="text-lg font-bold leading-none tracking-tight">
                  <span style={{ color: "oklch(0.65 0.18 245)" }}>Swap</span>
                  <span className="text-foreground">Spec</span>
                </span>
                <ThemeToggle />
              </div>
              <div className="flex h-[calc(100%-56px)] flex-col">
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="border-t border-border/30 p-4">
                  <UserMenu />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <span className="font-bold">
            <span style={{ color: "oklch(0.65 0.18 245)" }}>Swap</span>Spec
          </span>

          {hasTabs && (
            <div className="flex flex-1 items-center gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className="px-2 text-xs font-medium transition-colors"
                    style={{
                      color: isActive
                        ? "oklch(0.65 0.18 245)"
                        : "var(--color-muted-foreground)",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Link href="/builds/new">
              <Button
                size="sm"
                style={{ background: "oklch(0.65 0.18 245)", color: "#fff" }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TopBarTabsProvider>
      <AppShellInner>{children}</AppShellInner>
    </TopBarTabsProvider>
  );
}
