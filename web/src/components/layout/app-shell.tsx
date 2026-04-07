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
  return "SwapSpec";
}

function SidebarBrand() {
  return (
    <div className="flex h-14 items-center justify-between px-4">
      <span className="text-lg font-bold leading-none tracking-tight">
        <span style={{ color: "oklch(0.65 0.18 245)" }}>Swap</span>
        <span className="text-foreground">Spec</span>
      </span>
      <ThemeToggle />
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <SidebarBrand />

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = usePageTitle();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className="hidden w-64 shrink-0 md:flex md:flex-col"
        style={{
          background: "var(--color-sidebar)",
          borderRight:
            "1px solid color-mix(in oklch, var(--color-border) 50%, transparent)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop top bar */}
        <header className="hidden h-14 shrink-0 items-center justify-between border-b px-6 md:flex">
          <h2 className="text-base font-bold">{pageTitle}</h2>
          <div className="flex items-center gap-2">
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
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <span className="font-bold">
            <span style={{ color: "oklch(0.65 0.18 245)" }}>Swap</span>Spec
          </span>

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
