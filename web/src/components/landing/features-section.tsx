"use client";

import { motion } from "framer-motion";
import { Cpu, Box, MessageSquare, FolderKanban } from "lucide-react";
import { FlippingCard } from "@/components/ui/flipping-card";

const features = [
  {
    icon: Cpu,
    title: "Smart Compatibility",
    description:
      "Automatic bellhousing pattern matching and VIN decoder for instant vehicle identification. Know what fits before you buy.",
  },
  {
    icon: Box,
    title: "3D Model Library",
    description:
      "Browse a library of existing 3D scans and models. Scan your own vehicle or upload a scan if it doesn't already exist in our catalog.",
  },
  {
    icon: MessageSquare,
    title: "AI Build Advisor",
    description:
      "Chat with an AI that searches real service manuals for your specific chassis, engine, and transmission — not generic advice.",
  },
  {
    icon: FolderKanban,
    title: "Build Management",
    description:
      "Track multiple swap projects with full spec sheets, compatibility reports, and one-click PDF exports to share with your shop.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function CardFace({
  icon: Icon,
  title,
}: {
  icon: (typeof features)[0]["icon"];
  title: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center">
      <div
        className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "oklch(0.65 0.18 245 / 0.12)" }}
      >
        <Icon className="h-8 w-8" style={{ color: "oklch(0.65 0.18 245)" }} />
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">Hover to learn more</p>
    </div>
  );
}

function CardBack({ description }: { description: string }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center rounded-2xl border p-8 text-center"
      style={{
        background:
          "radial-gradient(circle at center, oklch(0.65 0.18 245 / 0.08), transparent 70%)",
        borderColor: "oklch(0.65 0.18 245 / 0.4)",
      }}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Plan Your Swap
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            From compatibility checks to AI guidance, SwapSpec covers every step
            of the engine swap process.
          </p>
        </motion.div>

        {/* 2×2 flip card grid */}
        <motion.div
          className="grid gap-6 sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="h-64"
            >
              <FlippingCard
                front={<CardFace icon={feature.icon} title={feature.title} />}
                back={<CardBack description={feature.description} />}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
