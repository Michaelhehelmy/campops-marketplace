// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/components/FeatureGate.tsx
 * Tests feature flag gating component
 */

import React from "react";
import { describe, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeatureGate } from "../FeatureGate";

// Mock the useFlag hook
const mockUseFlag = vi.fn();

vi.mock("@/lib/featureFlags", () => ({
  useFlag: (flag: string) => mockUseFlag(flag),
}));

describe("FeatureGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when feature flag is enabled", () => {
    mockUseFlag.mockReturnValue(true);

    render(
      <FeatureGate flag="test_feature">
        <div data-testid="feature-content">Feature Content</div>
      </FeatureGate>
    );

    expect(screen.getByTestId("feature-content")).toBeInTheDocument();
    expect(mockUseFlag).toHaveBeenCalledWith("test_feature");
  });

  it("renders fallback when feature flag is disabled", () => {
    mockUseFlag.mockReturnValue(false);

    render(
      <FeatureGate flag="disabled_feature" fallback={<div data-testid="fallback">Fallback</div>}>
        <div data-testid="feature-content">Feature Content</div>
      </FeatureGate>
    );

    expect(screen.getByTestId("fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("feature-content")).not.toBeInTheDocument();
  });

  it("renders null when feature flag is disabled and no fallback provided", () => {
    mockUseFlag.mockReturnValue(false);

    const { container } = render(
      <FeatureGate flag="disabled_feature">
        <div>Feature Content</div>
      </FeatureGate>
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders children when flag is enabled with complex children", () => {
    mockUseFlag.mockReturnValue(true);

    render(
      <FeatureGate flag="multi_property">
        <div>
          <h1>Property Switcher</h1>
          <button>Select Property</button>
        </div>
      </FeatureGate>
    );

    expect(screen.getByText("Property Switcher")).toBeInTheDocument();
    expect(screen.getByText("Select Property")).toBeInTheDocument();
  });

  it("handles navigation fallback correctly", () => {
    mockUseFlag.mockReturnValue(false);

    const MockNavigate = () => <div data-testid="navigate">Redirecting...</div>;

    render(
      <FeatureGate flag="marketplace" fallback={<MockNavigate />}>
        <div>Marketplace Content</div>
      </FeatureGate>
    );

    expect(screen.getByTestId("navigate")).toBeInTheDocument();
  });

  it("calls useFlag with the correct flag name", () => {
    mockUseFlag.mockReturnValue(true);

    render(
      <FeatureGate flag="specific_feature">
        <div>Content</div>
      </FeatureGate>
    );

    expect(mockUseFlag).toHaveBeenCalledTimes(1);
    expect(mockUseFlag).toHaveBeenCalledWith("specific_feature");
  });
});
