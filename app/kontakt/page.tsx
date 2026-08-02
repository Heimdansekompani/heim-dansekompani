import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { InstagramIcon, FacebookIcon } from "@/components/icons/social";

export const metadata: Metadata = {
  title: "Kontakt | Heim Dansekompani",
};

const contactLinks = [
  {
    label: "E-post",
    value: "post@heimdansekompani.no",
    href: "mailto:post@heimdansekompani.no",
    icon: Mail,
  },
  {
    label: "Instagram",
    value: "@heimdansekompani",
    href: "https://www.instagram.com/heimdansekompani/",
    icon: InstagramIcon,
  },
  {
    label: "Facebook",
    value: "@heimdansekompani",
    href: "https://www.facebook.com/profile.php?id=61592539266461",
    icon: FacebookIcon,
  },
];

export default function KontaktPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
      <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
        Kontakt
      </h1>
      <p className="mt-4 max-w-xl font-serif text-base leading-relaxed text-white/70 sm:text-lg">
        Ta gjerne kontakt for booking, samarbeid eller andre henvendelser.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {contactLinks.map(({ label, value, href, icon: Icon }) => {
          const external = href.startsWith("http");
          return (
            <a
              key={label}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="group flex flex-col gap-4 border border-white/15 bg-white/5 p-6 transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <Icon className="h-6 w-6 text-white/60 transition-colors group-hover:text-white" />
              <div>
                <p className="text-sm tracking-wide text-white/50">{label}</p>
                <p className="mt-1 font-serif text-base break-words text-white">
                  {value}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      <div className="mt-16 border-t border-white/10 pt-8">
        <p className="text-sm tracking-wide text-white/50">
          Kunstnerisk leder
        </p>
        <p className="mt-1 font-serif text-lg">Mathias Lind Engelstad</p>
      </div>
    </div>
  );
}
