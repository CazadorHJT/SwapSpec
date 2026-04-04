"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveTextProps {
  text: string;
  className?: string;
  waveHeight?: number;
  duration?: number;
  delay?: number;
}

export function WaveText({
  text,
  className,
  waveHeight = 8,
  duration = 1.6,
  delay = 0.05,
}: WaveTextProps) {
  const chars = text.split("");

  return (
    <span className={cn("inline-flex flex-wrap", className)}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          animate={{ y: [0, -waveHeight, 0] }}
          transition={{
            duration,
            repeat: Infinity,
            delay: i * delay,
            ease: "easeInOut",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}
