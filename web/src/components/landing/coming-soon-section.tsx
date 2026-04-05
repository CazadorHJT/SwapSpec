"use client";

import { motion } from "framer-motion";
import { BarChart3, Package } from "lucide-react";

const upcoming = [
  {
    icon: BarChart3,
    title: "Build Progress Tracking",
    description:
      "Track exactly where you are in the build process at every stage. Log spending as you go to keep project expenses organized and stay on budget from day one to final startup.",
  },
  {
    icon: Package,
    title: "Aftermarket Parts",
    description:
      "Visualize the fitment of upgraded and aftermarket parts directly in the 3D bay. Add them to your build plan to ensure everything is tracked, compatible, and works with your existing components.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12 },
  }),
};

export function ComingSoonSection() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <span
            className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "oklch(0.65 0.18 245 / 0.12)",
              color: "oklch(0.65 0.18 245)",
            }}
          >
            Coming Soon
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            What&apos;s Being Built Next
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Features currently in development — coming to SwapSpec soon.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {upcoming.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="relative overflow-hidden rounded-2xl border bg-card p-8"
              style={{ borderColor: "oklch(0.65 0.18 245 / 0.2)" }}
            >
              {/* Subtle top-left glow */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "radial-gradient(circle at top left, oklch(0.65 0.18 245 / 0.06), transparent 55%)",
                }}
              />

              {/* Coming soon ribbon */}
              <div className="mb-6 flex items-center gap-3">
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: "oklch(0.65 0.18 245 / 0.10)" }}
                >
                  <item.icon
                    className="h-6 w-6"
                    style={{ color: "oklch(0.65 0.18 245)" }}
                  />
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    background: "oklch(0.65 0.18 245 / 0.10)",
                    color: "oklch(0.65 0.18 245)",
                  }}
                >
                  In Development
                </span>
              </div>

              <h3 className="mb-3 text-xl font-bold">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
