import Link from "next/link";
import { Mail } from "lucide-react";

import { InstagramIcon, FacebookIcon } from "@/components/icons/social";
import { Wordmark } from "@/components/wordmark";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 md:flex-row md:justify-between">
        <Wordmark withLogo />

        <div className="flex flex-col gap-2 font-serif text-sm text-white/70">
          <a
            href="mailto:heimdansekompani@gmail.com"
            className="flex items-center gap-2 transition-colors hover:text-white"
          >
            <Mail className="h-4 w-4" />
            heimdansekompani@gmail.com
          </a>          
          <a
            href="https://www.instagram.com/heimdansekompani/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-colors hover:text-white"
          >
            <InstagramIcon className="h-4 w-4" />
            @heimdansekompani
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61592539266461"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-colors hover:text-white"
          >
            <FacebookIcon className="h-4 w-4" />
            @heimdansekompani
          </a>
        </div>

        <div className="flex flex-col gap-2 font-serif text-sm text-white/70">
          <Link href="/kontakt" className="transition-colors hover:text-white">
            Kontakt
          </Link>
          <Link href="/personer" className="transition-colors hover:text-white">
            Personer
          </Link>
          <Link
            href="/prosjekter"
            className="transition-colors hover:text-white"
          >
            Prosjekter
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6 text-center font-serif text-xs tracking-wide text-white/40">
        © {new Date().getFullYear()} Heim Dansekompani. Alle rettigheter
        forbeholdt.
      </div>
    </footer>
  );
}
