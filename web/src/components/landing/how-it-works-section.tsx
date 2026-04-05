"use client";

import { motion } from "framer-motion";
import { Car, Wrench, Bot, Ruler } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Car,
    title: "Select Your Vehicle",
    description:
      "Enter your VIN or browse our database to identify your chassis and lock in your donor vehicle specs.",
  },
  {
    number: "02",
    icon: Wrench,
    title: "Choose Your Powertrain",
    description:
      "Pick an engine and transmission. We automatically check bellhousing compatibility and flag fitment issues.",
  },
  {
    number: "03",
    icon: Bot,
    title: "Get AI Guidance",
    description:
      "Chat with an AI advisor that reads the real service manuals for your specific engine, transmission, and chassis.",
  },
  {
    number: "04",
    icon: Ruler,
    title: "Build With Confidence",
    description:
      "Visualize fitment in 3D, export a full spec sheet, and head into the build knowing exactly what to expect.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-6 py-24 sm:py-32">
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
            How It Works
          </h2>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            From idea to build plan in four steps.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connecting line (desktop only) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px lg:block"
            style={{
              background:
                "linear-gradient(to right, transparent, oklch(0.65 0.18 245 / 0.3) 20%, oklch(0.65 0.18 245 / 0.3) 80%, transparent)",
            }}
          />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              {/* Icon circle */}
              <div
                className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 bg-background"
                style={{ borderColor: "oklch(0.65 0.18 245 / 0.5)" }}
              >
                <step.icon
                  className="h-8 w-8"
                  style={{ color: "oklch(0.65 0.18 245)" }}
                />
                {/* Step number badge */}
                <span
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "oklch(0.65 0.18 245)" }}
                >
                  {i + 1}
                </span>
              </div>

              <h3 className="mb-2 font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
