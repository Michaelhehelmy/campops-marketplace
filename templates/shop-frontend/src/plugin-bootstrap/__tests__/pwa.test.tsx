/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PWAInstallBanner, PWASettingsPage, bootstrapPWA } from "../pwa";
import { componentRegistry } from "@/lib/ComponentRegistry";

describe("PWA Plugin", () => {
  beforeEach(() => {
    bootstrapPWA();
  });

  it("registers components in the componentRegistry", () => {
    expect(componentRegistry.resolve("pwa:PWAInstallBanner")).toBe(PWAInstallBanner);
    expect(componentRegistry.resolve("pwa:PWASettingsPage")).toBe(PWASettingsPage);
  });

  it("renders PWAInstallBanner correctly", () => {
    render(<PWAInstallBanner />);
    expect(screen.getByText("Install CampOps App")).toBeInTheDocument();
    expect(screen.getByText("Install Now")).toBeInTheDocument();
  });

  it("renders PWASettingsPage correctly", () => {
    render(<PWASettingsPage />);
    expect(screen.getByText("PWA Settings")).toBeInTheDocument();
    expect(screen.getByText("Offline Mode")).toBeInTheDocument();
  });
});
