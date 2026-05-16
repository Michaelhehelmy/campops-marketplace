// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/components/ConfirmDialog.tsx
 */

import React from "react";
import { describe, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "../ConfirmDialog";

// Mock the dialog and button components
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, onClick, variant, ...props }: any) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    title: "Confirm Action",
    description: "Are you sure you want to do this?",
  };

  it("renders with default props", () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Confirm Action");
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "Are you sure you want to do this?"
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByTestId("confirm-delete-btn")).toHaveTextContent("Confirm");
  });

  it("renders with custom button text", () => {
    render(<ConfirmDialog {...defaultProps} confirmText="Delete" cancelText="Keep" />);

    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
    expect(screen.getByTestId("confirm-delete-btn")).toHaveTextContent("Delete");
  });

  it("renders with destructive variant by default", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    expect(confirmBtn).toHaveAttribute("data-variant", "destructive");
  });

  it("renders with default variant when specified", () => {
    render(<ConfirmDialog {...defaultProps} variant="default" />);

    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    expect(confirmBtn).toHaveAttribute("data-variant", "default");
  });

  it("calls onOpenChange(false) when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onConfirm and onOpenChange(false) when confirm is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onOpenChange={onOpenChange} />);

    await user.click(screen.getByTestId("confirm-delete-btn"));

    expect(onConfirm).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render content when closed", () => {
    const { container } = render(<ConfirmDialog {...defaultProps} open={false} />);

    const dialog = screen.getByTestId("dialog");
    expect(dialog).toHaveAttribute("data-open", "false");
  });

  it("renders dialog content structure correctly", () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId("dialog-header")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-footer")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
  });
});
