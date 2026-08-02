"use client";

import { useEffect, useState } from "react";

/**
 * Returns true once the user has scrolled down past `revealAt` and is
 * actively scrolling further down; false near the top or while scrolling up.
 * `threshold` debounces small jitters (e.g. mobile bounce) from toggling it.
 */
export function useHideOnScroll(threshold = 8, revealAt = 80) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    function update() {
      const currentY = window.scrollY;

      if (Math.abs(currentY - lastY) > threshold) {
        setHidden(currentY > lastY && currentY > revealAt);
        lastY = currentY;
      }

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, revealAt]);

  return hidden;
}
