/**
 * MANVIA Client UI State Store (Zustand)
 * Strictly client-side presentation state only.
 * Server state belongs exclusively to TanStack Query.
 */

import { create } from "zustand";
import type { ThemeMode } from "@/types/common";

export interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  themeMode: ThemeMode;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  themeMode: "light",

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleMobileNav: () =>
    set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  setThemeMode: (mode) => set({ themeMode: mode }),
}));
