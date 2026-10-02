import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

describe("MANVIA UI Primitives Foundation", () => {
  describe("Button", () => {
    it("renders with text and default primary variant", () => {
      render(<Button>Confirm Action</Button>);
      const btn = screen.getByRole("button", { name: /Confirm Action/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass("manvia-btn-primary");
    });

    it("displays loading state and disables interaction", () => {
      render(<Button isLoading>Saving</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toHaveAttribute("aria-busy", "true");
      expect(btn).toBeDisabled();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("respects disabled attribute", () => {
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          Disabled Button
        </Button>,
      );
      const btn = screen.getByRole("button", { name: /Disabled Button/i });
      fireEvent.click(btn);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Input", () => {
    it("associates label with input field via htmlFor and id", () => {
      render(<Input label="Medical Registration ID" required />);
      const input = screen.getByLabelText(/Medical Registration ID/i);
      expect(input).toBeInTheDocument();
    });

    it('renders error state with aria-invalid and role="alert"', () => {
      render(<Input label="Email" errorText="Invalid email format" />);
      const input = screen.getByLabelText(/Email/i);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid email format",
      );
    });
  });

  describe("Card", () => {
    it("renders structured card container with header and content", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Vitals Summary</CardTitle>
          </CardHeader>
          <CardContent>Blood Pressure: 120/80</CardContent>
        </Card>,
      );

      expect(screen.getByText("Vitals Summary")).toBeInTheDocument();
      expect(screen.getByText("Blood Pressure: 120/80")).toBeInTheDocument();
    });
  });

  describe("Badge", () => {
    it("renders status badges with appropriate semantic classes", () => {
      render(<Badge variant="success">Verified</Badge>);
      const badge = screen.getByText("Verified");
      expect(badge).toHaveClass("manvia-badge-success");
    });
  });

  describe("Spinner & Skeleton", () => {
    it('renders accessible spinner with role="status"', () => {
      render(<Spinner label="Fetching patient records..." />);
      expect(
        screen.getByRole("status", { name: /Fetching patient records/i }),
      ).toBeInTheDocument();
    });

    it("renders skeleton shimmer placeholder with aria-hidden", () => {
      const { container } = render(<Skeleton width={200} height={20} />);
      const skeleton = container.querySelector(".manvia-skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Modal", () => {
    it("renders accessible dialog when open and responds to Escape key", () => {
      const onClose = vi.fn();
      render(
        <Modal
          isOpen={true}
          onClose={onClose}
          title="Confirm Appointment Cancellation"
        >
          <p>Are you sure you want to cancel?</p>
        </Modal>,
      );

      const dialog = screen.getByRole("dialog", {
        name: /Confirm Appointment Cancellation/i,
      });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not render dialog when isOpen is false", () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Hidden Dialog">
          <p>Hidden</p>
        </Modal>,
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
