"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { AccountType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("hobbyist");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(email, password, accountType);
      toast.success("Account created! Please sign in.");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: branding panel */}
      <div
        className="relative hidden items-center justify-center p-12 lg:flex lg:w-1/2"
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

        {/* Centered content group */}
        <div className="relative flex flex-col items-center gap-8 text-center">
          <Link
            href="/"
            className="text-5xl font-bold text-white tracking-tight"
          >
            SwapSpec
          </Link>

          <div>
            <p className="mb-2 text-3xl font-bold leading-snug text-white">
              Your next build
              <br />
              starts here.
            </p>
            <p className="text-sm text-white/50">
              Join SwapSpec and plan your engine swap with AI, 3D models, and
              real compatibility data.
            </p>
          </div>
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

          <h1 className="mb-1 text-2xl font-bold">Create Account</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Join SwapSpec to start planning your engine swap
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
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as AccountType)}
              >
                <SelectTrigger id="accountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hobbyist">Hobbyist</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
