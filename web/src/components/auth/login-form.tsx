"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Logged in successfully");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: branding panel */}
      <div
        className="relative hidden flex-col items-center p-12 lg:flex lg:w-1/2"
        style={{
          background:
            "radial-gradient(ellipse at top left, oklch(0.65 0.18 245 / 0.18) 0%, transparent 60%), oklch(0.12 0 0)",
        }}
      >
        {/* Dot pattern */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(0.65 0.18 245 / 0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 30% 40%, transparent 50%, oklch(0.12 0 0) 100%)",
          }}
        />

        {/* Wordmark — big, centered at top */}
        <Link
          href="/"
          className="relative text-5xl font-bold text-white tracking-tight"
        >
          SwapSpec
        </Link>

        {/* Tagline — moved up from bottom, centered */}
        <div className="relative mt-auto mb-16 text-center">
          <p className="mb-2 text-3xl font-bold leading-snug text-white">
            Plan your swap.
            <br />
            Build with confidence.
          </p>
          <p className="text-sm text-white/50">
            AI-powered engine swap planning with 3D fitment visualization.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/"
            className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>

          <h1 className="mb-1 text-2xl font-bold">Sign In</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Enter your credentials to access SwapSpec
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary underline underline-offset-4">
              Register
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
