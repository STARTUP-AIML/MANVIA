import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { I18nProvider, useTranslation } from "@/i18n/i18nContext";

describe("MANVIA i18n Foundation", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
  );

  it("translates nested dictionary keys correctly", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t("common.appName")).toBe("MANVIA");
    expect(result.current.t("common.tagline")).toBe("Care that feels human.");
    expect(result.current.t("common.loading")).toBe("Loading...");
  });

  it("falls back to key path when translation key is unknown", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t("unknown.nested.key")).toBe("unknown.nested.key");
  });

  it("supports language switching", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.language).toBe("en");

    act(() => {
      result.current.setLanguage("te");
    });

    expect(result.current.language).toBe("te");
    // Falls back gracefully to English until Telugu pack is fully mapped
    expect(result.current.t("common.appName")).toBe("MANVIA");
  });
});
