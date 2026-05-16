/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../Card";

describe("Card Component", () => {
  it("renders card with content", () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText("Card Content")).toBeInTheDocument();
  });

  it("renders card with header", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText("Card Title")).toBeInTheDocument();
  });

  it("renders card with description", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText("Card description text")).toBeInTheDocument();
  });

  it("renders card with content section", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Main content goes here</CardContent>
      </Card>
    );
    expect(screen.getByText("Main content goes here")).toBeInTheDocument();
  });

  it("renders card with footer", () => {
    render(
      <Card>
        <CardContent>Content</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("applies custom className to Card", () => {
    render(<Card className="custom-card-class">Content</Card>);
    expect(screen.getByText("Content")).toHaveClass("custom-card-class");
  });

  it("applies custom className to CardHeader", () => {
    render(
      <Card>
        <CardHeader className="custom-header">Header</CardHeader>
      </Card>
    );
    expect(screen.getByText("Header")).toHaveClass("custom-header");
  });

  it("applies custom className to CardTitle", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle className="custom-title">Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText("Title")).toHaveClass("custom-title");
  });

  it("applies custom className to CardDescription", () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription className="custom-desc">Description</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText("Description")).toHaveClass("custom-desc");
  });

  it("applies custom className to CardContent", () => {
    render(
      <Card>
        <CardContent className="custom-content">Content</CardContent>
      </Card>
    );
    expect(screen.getByText("Content")).toHaveClass("custom-content");
  });

  it("applies custom className to CardFooter", () => {
    render(
      <Card>
        <CardFooter className="custom-footer">Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText("Footer")).toHaveClass("custom-footer");
  });

  it("renders complete card with all sections", () => {
    render(
      <Card className="main-card">
        <CardHeader>
          <CardTitle>Complete Card</CardTitle>
          <CardDescription>This is a full card example</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Here is the main content area</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText("Complete Card")).toBeInTheDocument();
    expect(screen.getByText("This is a full card example")).toBeInTheDocument();
    expect(screen.getByText("Here is the main content area")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });
});
