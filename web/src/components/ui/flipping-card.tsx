"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface FlippingCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}

export function FlippingCard({ front, back, className }: FlippingCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={cn("h-full w-full cursor-pointer", className)}
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
        >
          {front}
        </div>

        {/* Back */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}
