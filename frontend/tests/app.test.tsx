import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { LandingRoute } from "@/routes/LandingRoute";

describe("MANVIA App Foundation", () => {
  it("renders landing page with MANVIA brand and tagline", () => {
    renderWithProviders(<LandingRoute />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Care made simpler." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Frontend Phase 0: Foundation & Project Setup"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Launch Patient Portal/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Developer Health Check/i }),
    ).toBeInTheDocument();
  });

  it("renders portal cards for Patient, Doctor, and Admin workspaces", () => {
    renderWithProviders(<LandingRoute />);

    expect(
      screen.getByRole("heading", { name: "Patient Portal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Doctor Portal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Admin Console" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Developer Diagnostics" }),
    ).toBeInTheDocument();
  });
});
