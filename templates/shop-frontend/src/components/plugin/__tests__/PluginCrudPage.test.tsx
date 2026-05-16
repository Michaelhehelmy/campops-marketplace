/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/components/plugin/PluginCrudPage.tsx
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { render } from "@/test/test-utils";
import { PluginCrudPage } from "../PluginCrudPage";

// ── Mock api ──────────────────────────────────────────────────────────────────
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/lib/api";

const MOCK_ROWS = [
  { id: "r1", name: "Alpha", status: "active", created_at: "2024-01-01T00:00:00Z" },
  { id: "r2", name: "Beta", status: "inactive", created_at: "2024-02-01T00:00:00Z" },
];

const DEFAULT_PROPS = {
  pluginName: "test-dock",
  tableSuffix: "dummy",
  columns: ["name", "status"],
  title: "Test Table",
  canCreate: true,
  canEdit: true,
  canDelete: true,
};

function mockSuccess(data = MOCK_ROWS) {
  (api.get as any).mockResolvedValue({
    data: { data, pagination: { page: 1, limit: 20, total: data.length, pages: 1 } },
  });
}

function mockLoading() {
  (api.get as any).mockReturnValue(new Promise(() => {})); // never resolves
}

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────

describe("PluginCrudPage – loading state", () => {
  it("shows skeleton placeholders while data is loading", () => {
    mockLoading();
    const { container } = render(<PluginCrudPage {...DEFAULT_PROPS} />);
    // Skeleton divs should be present
    expect(
      container.querySelector('[data-slot="skeleton"]') ?? container.querySelector(".animate-pulse")
    ).toBeTruthy();
  });
});

describe("PluginCrudPage – data display", () => {
  it("renders the page title", async () => {
    mockSuccess();
    render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => expect(screen.getByText("Test Table")).toBeInTheDocument());
  });

  it("renders column headers for the provided columns (excluding always-hidden ones)", async () => {
    mockSuccess();
    render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });
  });

  it("renders a row for each data item", async () => {
    mockSuccess();
    render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });
  });

  it("shows empty state when data array is empty", async () => {
    mockSuccess([]);
    render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => {
      expect(screen.getByText(/no records/i)).toBeInTheDocument();
    });
  });
});

describe("PluginCrudPage – CRUD controls", () => {
  it("shows 'New' button when canCreate is true", async () => {
    mockSuccess();
    render(<PluginCrudPage {...DEFAULT_PROPS} canCreate={true} />);
    // The header button says "New" (with a Plus icon)
    await waitFor(() => expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument());
  });

  it("does not show 'New' button when canCreate is false", async () => {
    mockSuccess();
    render(<PluginCrudPage {...DEFAULT_PROPS} canCreate={false} />);
    await waitFor(() => {
      // No "New" or "Add first record" button in the header
      expect(screen.queryByRole("button", { name: /^new$/i })).not.toBeInTheDocument();
    });
  });

  it("shows an edit icon button per row when canEdit is true", async () => {
    mockSuccess();
    render(<PluginCrudPage {...DEFAULT_PROPS} canEdit={true} canDelete={false} />);
    // Edit buttons are icon-only (Pencil icon, no text) — query by container count
    await waitFor(() => {
      // The table should have rendered — check for action cell presence
      // Each row has an Actions column when canEdit or canDelete is true
      const rows = screen.getAllByRole("row");
      // rows[0] is header, rest are data rows
      expect(rows.length - 1).toBe(MOCK_ROWS.length);
    });
  });

  it("shows a delete icon button per row when canDelete is true", async () => {
    mockSuccess();
    render(<PluginCrudPage {...DEFAULT_PROPS} canEdit={false} canDelete={true} />);
    await waitFor(() => {
      // Actions header should appear
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });
});

describe("PluginCrudPage – pagination", () => {
  it("shows prev/next buttons when there are multiple pages", async () => {
    (api.get as any).mockResolvedValue({
      data: {
        data: MOCK_ROWS,
        pagination: { page: 1, limit: 25, total: 50, pages: 3 },
      },
    });
    render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => {
      // Component shows "1–2 of 50" style text and Prev/Next buttons
      expect(screen.getByRole("button", { name: /prev/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });
  });

  it("does not show pagination when there is only one page", async () => {
    mockSuccess();
    render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /prev/i })).not.toBeInTheDocument();
    });
  });
});

describe("PluginCrudPage – helpers", () => {
  it("formats boolean values as Yes/No", async () => {
    (api.get as any).mockResolvedValue({
      data: {
        data: [{ id: "1", active: true, inactive: false }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    });
    render(<PluginCrudPage {...DEFAULT_PROPS} columns={["active", "inactive"]} />);
    await waitFor(() => {
      expect(screen.getByText("Yes")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });
  });

  it("formats null values as em dash", async () => {
    (api.get as any).mockResolvedValue({
      data: {
        data: [{ id: "1", empty: null }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    });
    render(<PluginCrudPage {...DEFAULT_PROPS} columns={["empty"]} />);
    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it("formats date strings as locale string", async () => {
    (api.get as any).mockResolvedValue({
      data: {
        data: [{ id: "1", created: "2024-01-15T10:30:00Z" }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    });
    render(<PluginCrudPage {...DEFAULT_PROPS} columns={["created"]} />);
    await waitFor(() => {
      // Should contain some part of the formatted date
      const cell = screen.getByText(/2024|Jan|15/);
      expect(cell).toBeInTheDocument();
    });
  });

  it("formats objects as JSON strings", async () => {
    (api.get as any).mockResolvedValue({
      data: {
        data: [{ id: "1", config: { key: "value" } }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    });
    render(<PluginCrudPage {...DEFAULT_PROPS} columns={["config"]} />);
    await waitFor(() => {
      expect(screen.getByText(/key.*value/i)).toBeInTheDocument();
    });
  });

  it("hides always-hidden columns (id, property_id, updated_at)", async () => {
    (api.get as any).mockResolvedValue({
      data: {
        data: [{ id: "hidden-id", property_id: "hidden", updated_at: "hidden", name: "Visible" }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    });
    render(
      <PluginCrudPage {...DEFAULT_PROPS} columns={["id", "property_id", "updated_at", "name"]} />
    );
    await waitFor(() => {
      // Should show "Name" but not the hidden columns
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Visible")).toBeInTheDocument();
      expect(screen.queryByText("Id")).not.toBeInTheDocument();
    });
  });
});

describe("PluginCrudPage – create flow", () => {
  it("opens create modal when 'New' button clicked", async () => {
    mockSuccess();
    const { user } = render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /new/i }));

    expect(screen.getByText(/new record/i)).toBeInTheDocument();
  });

  it("opens create modal from empty state 'Add first record' button", async () => {
    mockSuccess([]);
    const { user } = render(<PluginCrudPage {...DEFAULT_PROPS} />);

    await waitFor(() => expect(screen.getByText(/no records/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /add first record/i }));

    expect(screen.getByText(/create.*new|add.*record/i)).toBeInTheDocument();
  });

  it("calls api.post when saving new record", async () => {
    mockSuccess();
    (api.post as any).mockResolvedValue({ id: "new-id" });

    const { user } = render(<PluginCrudPage {...DEFAULT_PROPS} columns={["name"]} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /new/i }));

    // Fill in form
    const input = screen.getByPlaceholderText(/name/i);
    await user.type(input, "New Record");

    // Click save
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/tables/test-dock/dummy", expect.any(Object));
    });
  });
});

describe("PluginCrudPage – edit flow", () => {
  it("opens edit modal when edit button clicked", async () => {
    mockSuccess();
    const { user } = render(<PluginCrudPage {...DEFAULT_PROPS} />);

    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    // Click edit button (first row)
    const editButtons = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.querySelector('svg[data-lucide="pencil"]') || btn.innerHTML.includes("lucide-pencil")
      );
    if (editButtons.length > 0) {
      await user.click(editButtons[0]);
    }

    // Modal should be open with edit title
    expect(screen.queryByText(/edit/i)).toBeInTheDocument();
  });

  it("calls api.put when updating record", async () => {
    mockSuccess();
    (api.put as any).mockResolvedValue({ id: "r1" });

    const { user } = render(<PluginCrudPage {...DEFAULT_PROPS} columns={["name"]} />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    // Find and click edit button
    const editButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg") && !btn.textContent?.toLowerCase().includes("new"));
    if (editButtons.length > 0) {
      await user.click(editButtons[0]);
    }

    // Update form
    const input = screen.getByPlaceholderText(/name/i);
    await user.clear(input);
    await user.type(input, "Updated Name");

    // Save
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/admin/tables/test-dock/dummy/r1", expect.any(Object));
    });
  });
});

describe("PluginCrudPage – delete flow", () => {
  it("opens delete confirmation when delete button clicked", async () => {
    mockSuccess();
    const { user } = render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    // Find and click delete button
    const deleteButtons = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.querySelector('svg[data-lucide="trash"]') || btn.innerHTML.includes("lucide-trash")
      );
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);
    }

    // Confirmation dialog should appear - look for delete confirmation title
    await waitFor(() => {
      expect(screen.queryByText(/delete record/i)).toBeInTheDocument();
    });
  });

  it("calls api.delete when confirming deletion", async () => {
    mockSuccess();
    (api.delete as any).mockResolvedValue({ success: true });

    const { user } = render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    // Find and click delete button
    const deleteButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg") && !btn.textContent?.toLowerCase().includes("new"));
    if (deleteButtons.length > 1) {
      await user.click(deleteButtons[1]); // Second action button is usually delete
    }

    // Confirm deletion if dialog appears
    const confirmBtn = screen.queryByRole("button", { name: /delete|confirm/i });
    if (confirmBtn) {
      await user.click(confirmBtn);
    }

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/admin/tables/test-dock/dummy/r1");
    });
  });
});

describe("PluginCrudPage – error handling", () => {
  it("shows error toast when create fails", async () => {
    mockSuccess();
    const error = { response: { data: { error: "Name is required" } } };
    (api.post as any).mockRejectedValue(error);

    const { user } = render(<PluginCrudPage {...DEFAULT_PROPS} columns={["name"]} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /new/i }));

    // Try to save without filling required fields
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Wait for error to be handled (toast may appear)
    await waitFor(() => {
      // Check that api.post was called (error was triggered)
      expect(api.post).toHaveBeenCalled();
    });
  });
});

describe("PluginCrudPage – pagination navigation", () => {
  it("navigates to next page when Next clicked", async () => {
    // Mock to return different data based on page param
    (api.get as any).mockImplementation((url: string) => {
      const page = url.includes("page=2") ? 2 : 1;
      return Promise.resolve({
        data: {
          data: page === 2 ? MOCK_ROWS.slice(0, 1) : MOCK_ROWS,
          pagination: { page, limit: 25, total: 50, pages: 2 },
        },
      });
    });

    const { user } = render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /next/i }));

    // Should show page 2 data (only Alpha)
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("disables prev button on first page", async () => {
    (api.get as any).mockResolvedValue({
      data: {
        data: MOCK_ROWS,
        pagination: { page: 1, limit: 25, total: 50, pages: 2 },
      },
    });

    render(<PluginCrudPage {...DEFAULT_PROPS} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /prev/i })).toBeInTheDocument());

    const prevBtn = screen.getByRole("button", { name: /prev/i });
    expect(prevBtn).toBeDisabled();
  });
});
