"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(false);
    setProgress(100);
    const timeout = setTimeout(() => setProgress(0), 200);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  // Listen for link clicks to start progress
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      // Same page link, ignore
      if (href === pathname) return;

      setLoading(true);
      setProgress(30);

      // Gradually increase progress
      const timer1 = setTimeout(() => setProgress(60), 100);
      const timer2 = setTimeout(() => setProgress(80), 300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (progress === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className={cn(
          "h-full bg-primary transition-all duration-200 ease-out",
          !loading && "duration-300",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
