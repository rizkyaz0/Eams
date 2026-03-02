"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeTransition() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setMounted(true);

    // We listen to a custom event dispatched by ThemeSwitcher
    const handleStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsTransitioning(true);

      // Based on the animation math: middle of screen peak is around 400ms.
      setTimeout(() => {
        setTheme(customEvent.detail);
      }, 400);

      // Complete cleanup after the wave finishes exiting
      setTimeout(() => {
        setIsTransitioning(false);
      }, 1200);
    };

    window.addEventListener("theme-transition-start", handleStart);
    return () => window.removeEventListener("theme-transition-start", handleStart);
  }, [setTheme]);

  if (!mounted) return null;

  // Render a grid to produce the dot wave effect
  const rows = 15;
  const cols = 25;
  const dots = Array.from({ length: rows * cols }).map((_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return { id: i, r, c };
  });

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          initial={{ backdropFilter: "blur(0px)" }}
          animate={{ backdropFilter: "blur(8px)" }}
          exit={{ backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-100 pointer-events-none flex flex-wrap overflow-hidden"
          style={{ width: "100vw", height: "100vh" }}
        >
          {dots.map((dot) => {
            // Distance calculating from Top-Right (r=0, c=cols-1) to Bottom-Left
            const dist = dot.r + (cols - 1 - dot.c);

            return (
              <div key={dot.id} style={{ width: `${100 / cols}%`, height: `${100 / rows}%` }} className="flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  // Keyframes: grow to small translucent circle, then shrink to 0
                  animate={{ scale: [0, 1.2, 0], opacity: [0, 0.3, 0] }}
                  transition={{
                    duration: 0.6,
                    delay: dist * 0.015, // faster diagonal sweep
                    ease: "easeInOut",
                    times: [0, 0.5, 1],
                  }}
                  className="w-3 h-3 md:w-5 md:h-5 bg-foreground rounded-full"
                />
              </div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
