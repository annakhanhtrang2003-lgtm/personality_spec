import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PersonalDefinitionLayout from "../../layout";

describe("PersonalDefinitionLayout", () => {
  it("renders just the test — no worker header or footer", () => {
    const { container } = render(
      <PersonalDefinitionLayout>
        <p>content</p>
      </PersonalDefinitionLayout>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
    expect(container.querySelector("main")!.className).not.toContain("pt-[60px]");
  });
});
