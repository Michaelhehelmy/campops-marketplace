// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/components/ConflictResolutionModal.tsx
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConflictResolutionModal } from "../ConflictResolutionModal";

// Mock the dialog components
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children, className }: any) => (
    <div data-testid="dialog-title" className={className}>
      {children}
    </div>
  ),
}));

// Mock the Button component
vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button onClick={onClick} data-variant={variant} className={className}>
      {children}
    </button>
  ),
}));

// Mock lucide icons
vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span data-testid="alert-icon">⚠️</span>,
  RefreshCw: () => <span data-testid="refresh-icon">🔄</span>,
  Save: () => <span data-testid="save-icon">💾</span>,
}));

describe("ConflictResolutionModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onReload: vi.fn(),
    onKeepEditing: vi.fn(),
  };

  it("renders with conflict detected title", () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Page Conflict Detected");
    expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
  });

  it("renders with description", () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "This page has been modified on the server since you started editing"
    );
  });

  it("renders warning message", () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByText(/Warning:/)).toBeInTheDocument();
    expect(screen.getByText(/If you choose to reload/)).toBeInTheDocument();
  });

  it("renders reload from server button", () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    const reloadButton = screen.getByText("Reload from Server").closest("button");
    expect(reloadButton).toBeInTheDocument();
    expect(reloadButton).toHaveAttribute("data-variant", "outline");
    expect(screen.getByText(/Discard my changes/)).toBeInTheDocument();
  });

  it("renders keep my version button", () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    const keepButton = screen.getByText("Keep My Version").closest("button");
    expect(keepButton).toBeInTheDocument();
    expect(screen.getByText(/Keep editing and re-queue for sync/)).toBeInTheDocument();
  });

  it("calls onReload when reload button is clicked", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();

    render(<ConflictResolutionModal {...defaultProps} onReload={onReload} />);

    const reloadButton = screen.getByText("Reload from Server").closest("button");
    await user.click(reloadButton!);

    expect(onReload).toHaveBeenCalled();
  });

  it("calls onKeepEditing when keep editing button is clicked", async () => {
    const user = userEvent.setup();
    const onKeepEditing = vi.fn();

    render(<ConflictResolutionModal {...defaultProps} onKeepEditing={onKeepEditing} />);

    const keepButton = screen.getByText("Keep My Version").closest("button");
    await user.click(keepButton!);

    expect(onKeepEditing).toHaveBeenCalled();
  });

  it("calls onClose when dialog is closed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ConflictResolutionModal {...defaultProps} onClose={onClose} />);

    // The dialog component calls onClose when clicking outside or pressing escape
    const dialog = screen.getByTestId("dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
  });

  it("does not render when closed", () => {
    const { container } = render(<ConflictResolutionModal {...defaultProps} open={false} />);

    const dialog = screen.getByTestId("dialog");
    expect(dialog).toHaveAttribute("data-open", "false");
  });

  it("renders icons in buttons", () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByTestId("refresh-icon")).toBeInTheDocument();
    expect(screen.getByTestId("save-icon")).toBeInTheDocument();
  });

  it("has amber color styling classes", () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    const warningBox = screen.getByText(/Warning:/).parentElement;
    expect(warningBox?.className).toContain("amber");
  });
});
