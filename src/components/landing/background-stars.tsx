"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function BackgroundStars() {
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    // Generate random stars only on the client to avoid hydration mismatch
    const newStars = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1, // 1px to 4px
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    }));
    setTimeout(() => {
      setStars(newStars);
    }, 0);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-primary"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            willChange: "transform, opacity",
          }}
          initial={{ opacity: 0.2, scale: 0.5 }}
          animate={{
            opacity: [0.2, 0.9, 0.2],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
