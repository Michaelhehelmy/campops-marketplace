/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../Input";

describe("Input Component", () => {
  it("renders input element", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Input placeholder="Type here" onChange={onChange} />);

    const input = screen.getByPlaceholderText("Type here");
    await user.type(input, "Hello");

    expect(onChange).toHaveBeenCalled();
    expect(input).toHaveValue("Hello");
  });

  it("supports disabled state", () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled();
  });

  it("supports different types", () => {
    const { rerender } = render(<Input type="text" placeholder="Text" />);
    expect(screen.getByPlaceholderText("Text")).toHaveAttribute("type", "text");

    rerender(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute("type", "password");

    rerender(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");

    rerender(<Input type="number" placeholder="Number" />);
    expect(screen.getByPlaceholderText("Number")).toHaveAttribute("type", "number");
  });

  it("applies custom className", () => {
    render(<Input className="custom-class" placeholder="Styled" />);
    expect(screen.getByPlaceholderText("Styled")).toHaveClass("custom-class");
  });

  it("supports ref forwarding", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} placeholder="With ref" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("accepts default value", () => {
    render(<Input defaultValue="Default text" />);
    expect(screen.getByDisplayValue("Default text")).toBeInTheDocument();
  });

  it("supports name attribute", () => {
    render(<Input name="username" placeholder="Username" />);
    expect(screen.getByPlaceholderText("Username")).toHaveAttribute("name", "username");
  });

  it("supports required attribute", () => {
    render(<Input required placeholder="Required" />);
    expect(screen.getByPlaceholderText("Required")).toBeRequired();
  });
});
