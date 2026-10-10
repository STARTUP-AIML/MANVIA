import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { SplashScreen } from "@/features/splash/SplashScreen";
import { LandingRoute } from "@/routes/LandingRoute";
import { EnterpriseMegaFooter } from "@/components/layout/EnterpriseMegaFooter";
import { ECOSYSTEM_NODES } from "@/components/three/constants";
import { InteractiveEcosystem } from "@/components/three/InteractiveEcosystem";

// Mock Three.js / R3F Canvas since jsdom does not support full WebGL context
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas-mock">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: () => ({
    camera: { position: { set: vi.fn() } },
    gl: { domElement: document.createElement("canvas") },
  }),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("MANVIA Change 1 — Interactive Splash Screen", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders authentic MANVIA logo and orbital loading status", () => {
    const onComplete = vi.fn();
    render(<SplashScreen onComplete={onComplete} minDurationMs={1500} maxDurationMs={2000} />);

    // Logo check
    const logoImg = screen.getByTestId("splash-logo-image");
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute("src", "/manvia-original-logo.jpg");
    expect(logoImg).toHaveAttribute("alt", "MANVIA — Care that feels human");

    // Skip button check
    const skipBtn = screen.getByTestId("splash-skip-button");
    expect(skipBtn).toBeInTheDocument();

    // Status message
    expect(screen.getByText(/Preparing your MANVIA experience\.\.\./i)).toBeInTheDocument();
  });

  it("allows keyboard skip with Escape key", () => {
    const onComplete = vi.fn();
    render(<SplashScreen onComplete={onComplete} minDurationMs={1500} maxDurationMs={2000} />);

    fireEvent.keyDown(window, { key: "Escape" });
    vi.advanceTimersByTime(500);

    expect(onComplete).toHaveBeenCalled();
  });

  it("automatically completes within max duration bound", () => {
    const onComplete = vi.fn();
    render(<SplashScreen onComplete={onComplete} minDurationMs={1500} maxDurationMs={2000} />);

    vi.advanceTimersByTime(2600);
    expect(onComplete).toHaveBeenCalled();
  });
});

describe("MANVIA Change 2 — Single 'Get Started' CTA Rule", () => {
  beforeEach(() => {
    sessionStorage.setItem("manvia_splash_shown", "true");
  });

  it("renders EXACTLY ONE visible 'Get Started' button on the public landing page (in the top-right header)", () => {
    renderWithProviders(<LandingRoute />);

    // Query all buttons containing 'Get Started'
    const getStartedButtons = screen.getAllByRole("button", {
      name: /get started/i,
    });

    // Rule 2 check: exactly one Get Started button
    expect(getStartedButtons).toHaveLength(1);

    // Verify it is inside the header
    const singleButton = getStartedButtons[0]!;
    const header = screen.getByRole("banner");
    expect(header).toContainElement(singleButton);

    // Verify hero actions use dedicated exploratory CTAs instead of repeated Get Started
    expect(
      screen.getByRole("button", { name: /explore 3d healthcare ecosystem/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /launch patient portal/i })
    ).toBeInTheDocument();
  });
});

describe("MANVIA Change 2 — 3D Healthcare Ecosystem", () => {
  it("defines all 7 canonical MANVIA services with valid application routes", () => {
    expect(ECOSYSTEM_NODES).toHaveLength(7);
    const nodeIds = ECOSYSTEM_NODES.map((n) => n.id);

    expect(nodeIds).toContain("ai-companion");
    expect(nodeIds).toContain("wellness");
    expect(nodeIds).toContain("doctors");
    expect(nodeIds).toContain("appointments");
    expect(nodeIds).toContain("health-records");
    expect(nodeIds).toContain("health-timeline");
    expect(nodeIds).toContain("connected-care");

    // All routes must point to real application destinations
    ECOSYSTEM_NODES.forEach((node) => {
      expect(node.route).toMatch(/^\/app/);
      expect(node.label).toBeTruthy();
      expect(node.description).toBeTruthy();
    });
  });

  it("provides accessible 2-way tab controls and direct route navigation for each node", () => {
    renderWithProviders(<InteractiveEcosystem />);

    // Check accessible tablist
    const tabList = screen.getByRole("tablist", {
      name: /Healthcare Ecosystem Services/i,
    });
    expect(tabList).toBeInTheDocument();

    // Select the 'Doctor Discovery' node tab
    const tabs = screen.getAllByRole("tab");
    const doctorsTab = tabs.find((t) => t.textContent?.includes("Doctor"))!;
    expect(doctorsTab).toBeDefined();
    fireEvent.click(doctorsTab);

    // Verify active details panel updates with description and explore button
    expect(
      screen.getByText(/Verified Indian specialists across psychiatry/i)
    ).toBeInTheDocument();
    const exploreBtn = screen.getByRole("button", {
      name: /Explore Node/i,
    });
    expect(exploreBtn).toBeInTheDocument();
  });
});

describe("MANVIA Change 2 — Enterprise Mega Footer", () => {
  it("renders multi-column architecture with platform, solutions, resources, company, and legal", () => {
    renderWithProviders(<EnterpriseMegaFooter />);

    // Column titles as h3 headings
    expect(screen.getByRole("heading", { name: "Platform" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Solutions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resources" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company & Trust" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Legal & Compliance" })).toBeInTheDocument();

    // Healthcare clinical disclaimer
    expect(
      screen.getByText(/Clinical & Safety Notice:/i)
    ).toBeInTheDocument();

    // Monumental MANVIA wordmark (badge + giant wordmark)
    const brandElements = screen.getAllByText("MANVIA");
    expect(brandElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Care that feels human.")).toBeInTheDocument();

    // Copyright
    expect(
      screen.getByText(/© 2026 MANVIA Health Technologies Inc\. All rights reserved\./i)
    ).toBeInTheDocument();
  });

  it("handles email updates subscription with validation and feedback", async () => {
    renderWithProviders(<EnterpriseMegaFooter />);

    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    const subscribeBtn = screen.getByRole("button", { name: /Subscribe/i });

    // Submit valid email
    fireEvent.change(emailInput, { target: { value: "patient@example.com" } });
    fireEvent.click(subscribeBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Thank you for subscribing to MANVIA updates!/i)
      ).toBeInTheDocument();
    });
  });
});
