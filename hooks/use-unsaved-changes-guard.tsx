"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Warns before the user loses unsaved edits: a confirmation modal on
 * same-tab link clicks, and the browser's own native "leave site?" prompt on
 * refresh/close/external navigation — that one can't be replaced with custom
 * UI, browsers deliberately ignore any custom message/element for it.
 * Programmatic navigation (router.push) isn't intercepted — only real
 * anchor clicks — so a redirect right after a successful save is never
 * blocked.
 *
 * Render the returned `dialog` element somewhere in the calling component's
 * tree (it portals itself, so placement doesn't affect layout).
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const dirtyRef = useRef(isDirty);
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
    }

    function handleClick(event: MouseEvent) {
      if (!dirtyRef.current || event.defaultPrevented) return;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.origin !== window.location.origin) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      setPendingHref(anchor.getAttribute("href") || anchor.pathname);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  const confirmLeave = useCallback(() => {
    if (!pendingHref) return;
    router.push(pendingHref);
    setPendingHref(null);
  }, [pendingHref, router]);

  const dialog = (
    <AlertDialog
      open={pendingHref !== null}
      onOpenChange={(open) => {
        if (!open) setPendingHref(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Forlate siden uten å lagre?</AlertDialogTitle>
          <AlertDialogDescription>
            Du har ulagrede endringer. Hvis du forlater siden nå, går de tapt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bli på siden</AlertDialogCancel>
          <AlertDialogAction onClick={confirmLeave}>
            Forlat uten å lagre
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { dialog };
}
