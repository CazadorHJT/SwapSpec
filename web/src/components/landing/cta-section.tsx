"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaveText } from "@/components/ui/wave-text";

export function CtaSection() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <motion.div
        className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border p-12 text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        style={{
          background:
            "radial-gradient(ellipse at top, oklch(0.65 0.18 245 / 0.12) 0%, transparent 60%)",
          borderColor: "oklch(0.65 0.18 245 / 0.3)",
        }}
      >
        {/* Glow blob */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "oklch(0.65 0.18 245 / 0.15)" }}
        />

        <motion.h2
          className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <WaveText text="Ready to Plan Your Swap?" />
        </motion.h2>

        <motion.p
          className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Join builders using SwapSpec to take the guesswork out of engine
          swaps. Start free — no credit card required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link href="/register">
            <Button size="lg" className="gap-2 px-10">
              Start Your Free Trial
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
