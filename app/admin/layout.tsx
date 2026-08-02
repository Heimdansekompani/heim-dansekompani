"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isEditorOrAbove, useCurrentAdmin } from "@/hooks/use-current-admin";
import { AdminNav } from "@/components/admin/admin-nav";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/register"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useCurrentAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPath = PUBLIC_ADMIN_PATHS.includes(pathname);

  useEffect(() => {
    if (loading || isPublicPath || user) return;
    router.replace("/admin/login");
  }, [loading, isPublicPath, user, router]);

  if (isPublicPath) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
        {children}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-4xl items-center justify-center px-6 py-20">
        <p className="font-serif text-sm text-white/50">Laster …</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isEditorOrAbove(role)) {
    const isPending = role === "pending" || role === null;
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 sm:py-28">
        <h1 className="font-serif text-2xl tracking-wide">
          {isPending ? "Ikke godkjent ennå" : "Ingen tilgang"}
        </h1>
        <p className="mt-4 font-serif text-base leading-relaxed text-white/70">
          {isPending
            ? "Kontoen din venter på godkjenning fra en administrator."
            : "Kontoen din har ikke tilgang til adminpanelet. Ta kontakt med en administrator om du mener dette er feil."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <AdminNav />
      <div className="mt-10">{children}</div>
    </div>
  );
}
