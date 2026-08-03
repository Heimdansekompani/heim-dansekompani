"use client";

import { useContext } from "react";

import {
  CurrentAdminContext,
  type CurrentAdminState,
} from "@/contexts/current-admin-context";

export function useCurrentAdmin(): CurrentAdminState {
  const context = useContext(CurrentAdminContext);
  if (!context) {
    throw new Error(
      "useCurrentAdmin must be used within a CurrentAdminProvider",
    );
  }
  return context;
}
