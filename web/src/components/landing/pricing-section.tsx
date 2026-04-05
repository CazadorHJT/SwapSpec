"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Free Trial",
    price: { monthly: 0, yearly: 0 },
    description: "Explore SwapSpec before you commit.",
    features: [
      "View 3D model library",
      "Explore build combination possibilities",
      "Visualize your next build",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Hobbyist",
    price: { monthly: 39, yearly: 31 },
    description: "Everything you need for your next build.",
    features: [
      "1 active build at a time",
      "AI build advisor",
      "3D modeling and fitment tool",
      "PDF exports",
    ],
    cta: "Start Building",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Professional",
    price: { monthly: 149, yearly: 119 },
    description: "For shops and serious builders.",
    features: [
      "Unlimited builds",
      "AI build advisor",
      "3D modeling and fitment tool",
      "PDF exports",
      "Team features with multiple logins",
    ],
    cta: "Go Professional",
    highlighted: false,
  },
];

export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Start free. Upgrade when you&apos;re ready to build.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 rounded-full border p-1">
            <button
              onClick={() => setYearly(false)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                !yearly
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                yearly
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Yearly
              <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <SpotlightCard
                glowColor="oklch(0.65 0.18 245 / 0.18)"
                glowRadius={280}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-8 transition-colors",
                  tier.highlighted
                    ? "border-primary/50 bg-card shadow-lg"
                    : "bg-card hover:border-primary/30",
                )}
                style={
                  tier.highlighted
                    ? { boxShadow: "0 0 40px oklch(0.65 0.18 245 / 0.12)" }
                    : undefined
                }
              >
                {/* Glow overlay for highlighted card */}
                {tier.highlighted && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        "radial-gradient(circle at top center, oklch(0.65 0.18 245 / 0.07), transparent 60%)",
                    }}
                  />
                )}

                {/* Badge */}
                {tier.badge && (
                  <span
                    className="mb-4 inline-block self-start rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: "oklch(0.65 0.18 245)" }}
                  >
                    {tier.badge}
                  </span>
                )}

                <h3 className="mb-1 text-xl font-semibold">{tier.name}</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  {tier.description}
                </p>

                {/* Price */}
                <div className="mb-8 flex items-end gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={yearly ? "yearly" : "monthly"}
                      className="text-5xl font-bold"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      ${yearly ? tier.price.yearly : tier.price.monthly}
                    </motion.span>
                  </AnimatePresence>
                  {tier.price.monthly > 0 && (
                    <span className="mb-2 text-sm text-muted-foreground">
                      / mo
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <Check
                        className="mt-0.5 h-4 w-4 flex-shrink-0"
                        style={{ color: "oklch(0.65 0.18 245)" }}
                      />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="mt-auto">
                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
