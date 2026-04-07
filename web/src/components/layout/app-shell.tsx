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
    <div className="flex h-14 items-center gap-2 px-4">
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-none tracking-tight">
          <span style={{ color: "oklch(0.65 0.18 245)" }}>Swap</span>
          <span className="text-foreground">Spec</span>
        </span>
        <span
          className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest"
          style={{ color: "oklch(0.65 0.18 245 / 70%)" }}
        >
          Beta
        </span>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <SidebarBrand />

      {/* Divider */}
      <div
        className="mx-4 mb-2"
        style={{ height: 1, background: "oklch(1 0 0 / 6%)" }}
      />

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <SidebarNav onNavigate={onNavigate} />
      </div>

      {/* User section */}
      <div
        className="mx-4 mt-2"
        style={{ height: 1, background: "oklch(1 0 0 / 6%)" }}
      />
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
          background: "oklch(0.155 0.01 245)",
          borderRight: "1px solid oklch(1 0 0 / 8%)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop top bar */}
        <header
          className="hidden h-14 shrink-0 items-center justify-between px-6 md:flex"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <h2 className="text-sm font-semibold text-foreground/70">
            {pageTitle}
          </h2>
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
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile header */}
        <header
          className="flex h-14 shrink-0 items-center gap-3 px-4 md:hidden"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 p-0"
              style={{ background: "oklch(0.155 0.01 245)" }}
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
            <ThemeToggle />
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
