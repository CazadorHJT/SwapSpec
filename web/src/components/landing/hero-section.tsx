"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticlesBg } from "@/components/ui/particles-bg";

const words = ["AI-Powered", "Engine", "Swap", "Planning"];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const wordVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay },
  }),
};

function scrollTo(id: string) {
  const el = document.querySelector(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Interactive particles background */}
      <div className="pointer-events-none absolute inset-0">
        <ParticlesBg
          count={70}
          connectDistance={130}
          speed={0.35}
          className="h-full w-full"
        />
      </div>

      {/* Radial fade mask so particles fade at edges */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, var(--background) 100%)",
        }}
      />

      {/* Blue glow behind heading */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "oklch(0.65 0.18 245)" }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Animated heading */}
        <motion.h1
          className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {words.map((word, i) => (
            <motion.span
              key={i}
              variants={wordVariants}
              className="mr-4 inline-block last:mr-0"
            >
              {i === 0 ? (
                <span style={{ color: "oklch(0.65 0.18 245)" }}>{word}</span>
              ) : (
                word
              )}
            </motion.span>
          ))}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          custom={0.7}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          Plan your engine swap with intelligent compatibility analysis, 3D bay
          visualization, and an AI advisor that understands your build.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          custom={0.9}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <Link href="/register">
            <Button size="lg" className="gap-2 px-8">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-8"
            onClick={() => scrollTo("#model-showcase")}
          >
            See It In Action
            <ChevronDown className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        custom={1.4}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-6 w-6 text-muted-foreground/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
