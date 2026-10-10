import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { LandingRoute } from "@/routes/LandingRoute";

describe("MANVIA App Foundation & Product Landing", () => {
  it("renders landing page with MANVIA brand and tagline", () => {
    renderWithProviders(<LandingRoute />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Care that feels human." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your health journey, with intelligence that cares/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Launch Patient Portal/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Open Wellness Hub/i }),
    ).toBeInTheDocument();
  });

  it("renders core capability cards for AI, Wellness, Doctor Care, and Health Records", () => {
    renderWithProviders(<LandingRoute />);

    expect(
      screen.getByRole("heading", { name: "MANVIA AI" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Wellness" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Real Doctor Care" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Health Records" }),
    ).toBeInTheDocument();
  });

  it("renders connected ecosystem intelligence layer and interactive assistant preview", () => {
    renderWithProviders(<LandingRoute />);

    expect(
      screen.getByRole("heading", { name: /A Connected Healthcare/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("MANVIA AI Companion")).toBeInTheDocument();
    expect(screen.getByText("Product preview")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Healthcare Services for/i }),
    ).toBeInTheDocument();
  });
});
