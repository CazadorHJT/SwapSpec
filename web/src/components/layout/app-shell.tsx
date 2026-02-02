"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center px-4 font-bold text-lg">
          SwapSpec
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
        <Separator />
        <div className="flex items-center justify-between p-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="flex h-14 items-center px-4 font-bold text-lg">
                SwapSpec
              </SheetTitle>
              <Separator />
              <div className="p-3">
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </div>
              <Separator />
              <div className="flex items-center justify-between p-3">
                <ThemeToggle />
                <UserMenu />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-bold">SwapSpec</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
