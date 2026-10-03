import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { LandingRoute } from "@/routes/LandingRoute";
import { PatientRoute } from "@/routes/PatientRoute";
import { PatientShell } from "@/layouts/PatientShell";

describe("MANVIA Accessibility Baseline", () => {
  it("contains appropriate semantic landmarks (header, main, footer)", () => {
    renderWithProviders(<LandingRoute />);

    expect(screen.getByRole("banner")).toBeInTheDocument(); // <header>
    expect(screen.getByRole("main")).toBeInTheDocument(); // <main>
    expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // <footer>
  });

  it("provides navigation landmarks in shells", () => {
    renderWithProviders(
      <PatientShell>
        <PatientRoute />
      </PatientShell>,
    );

    const navs = screen.getAllByRole("navigation");
    expect(navs.length).toBeGreaterThan(0);
    expect(screen.getByRole("complementary")).toBeInTheDocument(); // <aside>
  });

  it("guarantees interactive buttons have accessible text names", () => {
    renderWithProviders(<LandingRoute />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toHaveAccessibleName();
    });
  });
});
