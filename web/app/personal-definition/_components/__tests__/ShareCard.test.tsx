import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { ShareCard } from "../ShareCard";
import { profile } from "./fixtures";

describe("ShareCard", () => {
  it("renders at a fixed 1080x1350", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ShareCard ref={ref} profile={profile} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current!.style.width).toBe("1080px");
    expect(ref.current!.style.height).toBe("1350px");
  });

  it("sits off-screen rather than hidden", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ShareCard ref={ref} profile={profile} />);
    expect(ref.current!.style.display).not.toBe("none");
    expect(ref.current!.style.left).toBe("-9999px");
  });

  it("carries the identity a friend would recognise", () => {
    render(<ShareCard profile={profile} />);
    expect(screen.getByText(profile.user.name)).toBeInTheDocument();
    expect(screen.getByText(profile.mbti.type)).toBeInTheDocument();
    expect(screen.getByText(profile.mbti.label)).toBeInTheDocument();
  });

  it("shows the mascot pose, named in Vietnamese", () => {
    render(<ShareCard profile={profile} />);
    expect(screen.getByAltText(`Linh vật ${profile.mbti.type}`)).toBeInTheDocument();
  });

  it("shows at most three keywords so the card never overflows", () => {
    render(<ShareCard profile={profile} />);
    expect(screen.getAllByTestId("share-keyword").length).toBeLessThanOrEqual(3);
  });
});
