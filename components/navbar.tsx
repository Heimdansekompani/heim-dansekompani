"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";

const navItems = [
  { href: "/om", label: "Om" },
  { href: "/personer", label: "Personer" },
  { href: "/prosjekter", label: "Prosjekter" },
  { href: "/kontakt", label: "Kontakt" },
];

export function Navbar() {
  const pathname = usePathname();
  const hidden = useHideOnScroll();
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md transition-transform duration-300 ease-in-out",
        hidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 text-white">
          <LogoMark className="h-14 w-14" />
          <span className="flex flex-col leading-none">
            <span className="mr-[-0.25em] font-serif text-3xl font-semibold tracking-[0.25em] underline underline-offset-4">
              HEIM
            </span>
            <span className="mr-[-0.02em] font-serif text-sm tracking-[0.1em]">
              Dansekompani
            </span>
          </span>
        </Link>

        <ul className="hidden items-center gap-10 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "font-serif text-sm tracking-wide text-white/70 transition-colors hover:text-white",
                    active && "text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 hover:text-white md:hidden"
                aria-label="Åpne meny"
              />
            }
          >
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="border-white/10 bg-black text-white"
          >
            <SheetHeader>
              <SheetTitle className="flex flex-col leading-none text-white">
                <span className="mr-[-0.25em] font-serif text-2xl tracking-[0.25em] underline underline-offset-6">
                  HEIM
                </span>
                <span className="mt-0.5 mr-[-0.02em] font-serif text-xs tracking-[0.02em]">
                  Dansekompani
                </span>
              </SheetTitle>
            </SheetHeader>
            <ul className="mt-4 flex flex-col gap-6 px-4">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <SheetClose
                      nativeButton={false}
                      render={
                        <Link
                          href={item.href}
                          className={cn(
                            "font-serif text-lg tracking-wide text-white/70 hover:text-white",
                            active && "text-white",
                          )}
                        />
                      }
                    >
                      {item.label}
                    </SheetClose>
                  </li>
                );
              })}
            </ul>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
