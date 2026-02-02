"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-bold">SwapSpec</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            AI-Powered Engine Swap Planning
          </h1>
          <p className="text-lg text-muted-foreground">
            Plan your engine swap with intelligent compatibility analysis,
            3D bay visualization, and an AI advisor that understands your build.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/register">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
        <div className="mt-8 grid max-w-3xl gap-6 sm:grid-cols-3">
          <div className="rounded-lg border p-6 text-left">
            <h3 className="mb-2 font-semibold">Smart Compatibility</h3>
            <p className="text-sm text-muted-foreground">
              Browse vehicles, engines, and transmissions with automatic
              bellhousing pattern matching.
            </p>
          </div>
          <div className="rounded-lg border p-6 text-left">
            <h3 className="mb-2 font-semibold">3D Visualization</h3>
            <p className="text-sm text-muted-foreground">
              Upload and view 3D scans of engine bays and components to
              plan fitment.
            </p>
          </div>
          <div className="rounded-lg border p-6 text-left">
            <h3 className="mb-2 font-semibold">AI Build Advisor</h3>
            <p className="text-sm text-muted-foreground">
              Chat with an AI that understands your specific build and provides
              tailored recommendations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
