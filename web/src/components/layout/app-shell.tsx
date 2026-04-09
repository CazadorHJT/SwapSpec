"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { TopBarTabsProvider, useTopBarTabs } from "@/lib/top-bar-context";

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

// Full sidebar content — used in mobile Sheet and the desktop overlay panel
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-4 border-t border-border/30" />
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <div className="mx-4 border-t border-border/30" />
      <div className="p-4">
        <UserMenu />
      </div>
    </div>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = usePageTitle();
  const { tabs, activeTab, setActiveTab } = useTopBarTabs();
  const hasTabs = tabs.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ── Desktop top bar (full width) ─────────────────────────── */}
      <header className="hidden h-14 shrink-0 items-center border-b md:flex">
        {/* Brand area — hover triggers the sidebar overlay */}
        <div
          className="group/sidebar relative z-30 flex h-14 w-56 shrink-0 cursor-default items-center justify-between border-r px-4"
          style={{ background: "var(--color-sidebar)" }}
        >
          <span className="text-lg font-bold leading-none tracking-tight">
            <span style={{ color: "oklch(0.65 0.18 245)" }}>Swap</span>
            <span className="text-foreground">Spec</span>
          </span>
          <ThemeToggle />

          {/* Overlay sidebar panel — drops down on hover */}
          <div
            className="invisible absolute left-0 top-14 flex w-56 flex-col opacity-0 shadow-xl transition-all duration-200 group-hover/sidebar:visible group-hover/sidebar:opacity-100"
            style={{
              background: "var(--color-sidebar)",
              height: "calc(100vh - 56px)",
              borderRight:
                "1px solid color-mix(in oklch, var(--color-border) 50%, transparent)",
            }}
          >
            <SidebarContent />
          </div>
        </div>

        {/* Right side of top bar */}
        {hasTabs ? (
          <>
            {/* Tabs — left-aligned immediately after brand */}
            <div className="flex items-center gap-1 pl-2">
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
            <div className="ml-auto pr-4">
              <Link href="/builds/new">
                <Button
                  size="sm"
                  style={{ background: "oklch(0.65 0.18 245)", color: "#fff" }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Build
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="flex-1 px-6 text-base font-bold">{pageTitle}</h2>
            <div className="pr-4">
              <Link href="/builds/new">
                <Button
                  size="sm"
                  style={{ background: "oklch(0.65 0.18 245)", color: "#fff" }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Build
                </Button>
              </Link>
            </div>
          </>
        )}
      </header>

      {/* ── Mobile header ────────────────────────────────────────── */}
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
            {/* Brand header inside mobile sheet */}
            <div className="flex h-14 items-center justify-between px-4">
              <span className="text-lg font-bold leading-none tracking-tight">
                <span style={{ color: "oklch(0.65 0.18 245)" }}>Swap</span>
                <span className="text-foreground">Spec</span>
              </span>
              <ThemeToggle />
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
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

      {/* ── Full-width page content ───────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
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
