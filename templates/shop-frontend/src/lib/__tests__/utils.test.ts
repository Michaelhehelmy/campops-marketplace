/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  formatDate,
  formatCurrency,
  formatNumber,
  truncateText,
  generateId,
  debounce,
} from "../utils";

describe("cn (className merge)", () => {
  it("merges simple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe("base active");
  });

  it("handles tailwind class conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles clsx array syntax", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", null, undefined, false, "bar")).toBe("foo bar");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles object syntax", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });
});

describe("formatDate", () => {
  it("formats string date", () => {
    const result = formatDate("2024-01-15");
    expect(result).toContain("Jan");
    expect(result).toContain("2024");
  });

  it("formats Date object", () => {
    const date = new Date("2024-06-20");
    const result = formatDate(date);
    expect(result).toContain("Jun");
    expect(result).toContain("2024");
  });

  it("handles YYYY-MM-DD format without UTC conversion issues", () => {
    const result = formatDate("2023-12-25");
    expect(result).toContain("Dec");
    expect(result).toContain("25");
  });

  it("formats with short month name", () => {
    const result = formatDate("2024-07-04");
    expect(result).toMatch(/Jul/);
  });

  it("includes year in output", () => {
    const result = formatDate("2024-03-10");
    expect(result).toContain("2024");
  });
});

describe("formatCurrency", () => {
  it("formats USD currency", () => {
    expect(formatCurrency(100)).toBe("$100.00");
  });

  it("formats with cents", () => {
    expect(formatCurrency(99.99)).toBe("$99.99");
  });

  it("formats EUR currency", () => {
    expect(formatCurrency(50, "EUR")).toBe("€50.00");
  });

  it("formats GBP currency", () => {
    expect(formatCurrency(75, "GBP")).toBe("£75.00");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("handles negative amounts", () => {
    expect(formatCurrency(-25.5)).toBe("-$25.50");
  });

  it("handles large numbers", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });

  it("defaults to USD when no currency specified", () => {
    expect(formatCurrency(50)).toContain("$");
  });
});

describe("formatNumber", () => {
  it("formats with thousand separators", () => {
    expect(formatNumber(1000)).toBe("1,000");
  });

  it("formats millions", () => {
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("formats small numbers without separators", () => {
    expect(formatNumber(999)).toBe("999");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("handles negative numbers", () => {
    expect(formatNumber(-5000)).toBe("-5,000");
  });

  it("handles decimals", () => {
    expect(formatNumber(1234.56)).toBe("1,234.56");
  });
});

describe("truncateText", () => {
  it("returns original text if shorter than maxLength", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("truncates text with ellipsis when longer", () => {
    expect(truncateText("hello world", 5)).toBe("hello...");
  });

  it("handles exact length", () => {
    expect(truncateText("hello", 5)).toBe("hello");
  });

  it("handles empty string", () => {
    expect(truncateText("", 5)).toBe("");
  });

  it("handles one character over", () => {
    expect(truncateText("abcdef", 5)).toBe("abcde...");
  });

  it("handles maxLength of 1", () => {
    expect(truncateText("abc", 1)).toBe("a...");
  });
});

describe("generateId", () => {
  it("generates a string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
  });

  it("generates unique IDs", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it("generates UUID format", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays function execution", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("arg1");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("arg1");
  });

  it("resets timer on multiple calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("first");
    vi.advanceTimersByTime(50);
    debounced("second");
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("second");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("handles multiple arguments", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("a", "b", 123);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("a", "b", 123);
  });

  it("preserves return type (void)", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    const result = debounced("test");
    expect(result).toBeUndefined();
  });

  it("handles rapid successive calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    for (let i = 0; i < 10; i++) {
      debounced(i);
      vi.advanceTimersByTime(50);
    }

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(9);
  });

  it("handles function with no arguments", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith();
  });
});
