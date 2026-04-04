"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const ModelViewer = dynamic(
  () =>
    import("@/components/viewer/model-viewer").then((m) => ({
      default: m.ModelViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    ),
  },
);

const features = [
  "Measure fitment and gaps",
  "Intuitive collision warning heatmap",
  "Predict frame and chassis modifications",
  "Plan out the custom work",
  "Have confidence your powertrain will fit",
];

export function ModelShowcase() {
  return (
    <section id="model-showcase" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Section heading */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            See Your Engine Bay in 3D
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Interact with real scan data before you ever pick up a wrench.
          </p>
        </motion.div>

        {/* Split layout */}
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Left: text */}
          <motion.div
            className="flex-shrink-0 lg:w-2/5"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              Use the library of scans to test the fitment of an engine and
              transmission in your chassis. Every scan is dimensionally accurate
              so you can plan with confidence.
            </p>

            <ul className="space-y-4">
              {features.map((f, i) => (
                <motion.li
                  key={f}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                >
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 flex-shrink-0"
                    style={{ color: "oklch(0.65 0.18 245)" }}
                  />
                  <span className="text-sm leading-relaxed">{f}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right: 3D viewer */}
          <motion.div
            className="relative w-full overflow-hidden rounded-2xl border bg-card lg:flex-1"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            style={{ height: "480px" }}
          >
            {/* Blue glow ring */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                boxShadow: "inset 0 0 60px oklch(0.65 0.18 245 / 0.08)",
              }}
            />

            <ModelViewer url="/test-scan.glb" />

            {/* Instructions */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="rounded-full border bg-background/80 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
                Drag to rotate · Scroll to zoom
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
