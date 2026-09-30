import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PersonalDefinitionPage from "../../page";
import { PART_COUNT, PART_SIZE } from "../../_lib/parts";

/**
 * Fills every onboarding field with a valid value. Reused by the scroll-reset
 * test and the full-flow teaser test, both of which need to get past
 * onboarding without touching DatePicker — the birth date here is three
 * plain <select> elements, which fireEvent.change drives fine under jsdom.
 */
/** Leaves the intro for the form. The page opens on the intro. */
function openForm() {
  fireEvent.click(screen.getByRole("button", { name: "Làm bài test ngay" }));
}

function fillOnboarding() {
  openForm();
  fireEvent.change(screen.getByPlaceholderText(/tên bạn muốn hiển thị/i), {
    target: { value: "Khánh" },
  });
  fireEvent.change(screen.getByPlaceholderText(/họ tên đầy đủ/i), {
    target: { value: "Nguyễn Thị Khánh Trang" },
  });
  fireEvent.change(screen.getByLabelText("Trường của bạn"), { target: { value: "ueh" } });
  fireEvent.change(screen.getByLabelText("Ngày"), { target: { value: "15" } });
  fireEvent.change(screen.getByLabelText("Tháng"), { target: { value: "6" } });
  fireEvent.change(screen.getByLabelText("Năm"), { target: { value: "2003" } });
}

// jsdom does not implement window.scrollTo — every test in this file mounts
// PersonalDefinitionPage, whose scroll-reset effect (page.tsx) now calls it
// on mount and on every phase/part change. Stubbed file-wide so no test logs
// "Not implemented: window.scrollTo() method".
let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  scrollTo.mockRestore();
});

describe("PersonalDefinitionPage", () => {
  it("opens on the intro, with no form fields yet", () => {
    render(<PersonalDefinitionPage />);
    expect(screen.getByText("Bạn có đang lạc lối?")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/tên bạn muốn hiển thị/i)).not.toBeInTheDocument();
  });

  it("blocks an empty form submit with a message", () => {
    render(<PersonalDefinitionPage />);
    openForm();
    fireEvent.click(screen.getByRole("button", { name: /^bắt đầu$/i }));
    expect(screen.getByText(/Cho mình biết tên bạn/i)).toBeInTheDocument();
  });
});

describe("page wiring", () => {
  it("shows no quiz controls before onboarding is submitted", () => {
    render(<PersonalDefinitionPage />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  // Regression: unlike the DatePicker-driven walkthrough, the onboarding
  // birth date is three plain <select> elements, which fireEvent.change
  // drives fine under jsdom — so this can exercise the real crash. A name
  // with no mappable letters (e.g. all digits) makes
  // normalizeVietnamese(full_name) === "", which calculateNumerology treats
  // as a thrown error. The preview memo used to run on every keystroke off
  // of only `birth_date`/`full_name` being non-empty, well before onboarding
  // validation had a chance to reject the name, so setting both fields
  // crashed the page with no error boundary in the route.
  it("does not crash when the full name has no mappable letters", () => {
    render(<PersonalDefinitionPage />);
    openForm();

    fireEvent.change(screen.getByPlaceholderText(/họ tên đầy đủ/i), {
      target: { value: "88" },
    });
    fireEvent.change(screen.getByLabelText("Ngày"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Tháng"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Năm"), { target: { value: "2000" } });

    expect(screen.getByRole("button", { name: /^bắt đầu$/i })).toBeInTheDocument();
  });
});

describe("full quiz flow", () => {
  it("walks all four parts, shows the teaser at exactly the halfway interlude, and reaches the result", () => {
    render(<PersonalDefinitionPage />);

    fillOnboarding();
    fireEvent.click(screen.getByRole("button", { name: /^bắt đầu$/i }));

    const teaserSeen: boolean[] = [];

    for (let part = 0; part < PART_COUNT; part++) {
      // Pointer clicks (detail: 1) — auto-advance opens each next row, so
      // the currently-open row's radios are always the ones on screen.
      for (let row = 0; row < PART_SIZE; row++) {
        fireEvent.click(screen.getAllByRole("radio")[0]!, { detail: 1 });
      }

      const isLastPart = part === PART_COUNT - 1;
      fireEvent.click(
        screen.getByRole("button", { name: isLastPart ? "Xem kết quả" : `Xong phần ${part + 1}` }),
      );

      if (!isLastPart) {
        teaserSeen.push(screen.queryByTestId("teaser") !== null);
        fireEvent.click(screen.getByRole("button", { name: "Đi tiếp" }));
      }
    }

    expect(teaserSeen).toEqual([false, true, false]);
    expect(screen.getByText("Bốn chiều của bạn")).toBeInTheDocument();
  }, 15_000);
});

describe("page scroll reset", () => {
  it("scrolls to the top when the screen changes (onboarding -> quiz)", () => {
    render(<PersonalDefinitionPage />);
    scrollTo.mockClear(); // ignore whatever ran on initial mount

    fillOnboarding();
    fireEvent.click(screen.getByRole("button", { name: /^bắt đầu$/i }));

    expect(screen.getAllByRole("radio")).toHaveLength(5); // now on the quiz
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

describe("intro flow", () => {
  it("stays on the intro when the hero CTA is pressed", () => {
    render(<PersonalDefinitionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu hành trình của bạn" }));
    expect(screen.getByRole("button", { name: "Làm bài test ngay" })).toBeInTheDocument();
  });

  // Review Focus 5
  it("scrolls to the top when moving from the intro to the form", () => {
    render(<PersonalDefinitionPage />);
    scrollTo.mockClear();
    openForm();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  // Review Focus 1
  it("keeps typed fields and a completed birth date across intro ↔ form", () => {
    render(<PersonalDefinitionPage />);
    fillOnboarding();
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(screen.getByRole("button", { name: "Làm bài test ngay" })).toBeInTheDocument();

    openForm();
    expect(screen.getByPlaceholderText(/tên bạn muốn hiển thị/i)).toHaveValue("Khánh");
    expect(screen.getByPlaceholderText(/họ tên đầy đủ/i)).toHaveValue("Nguyễn Thị Khánh Trang");
    expect(screen.getByLabelText("Ngày")).toHaveValue("15");
    expect(screen.getByLabelText("Tháng")).toHaveValue("6");
    expect(screen.getByLabelText("Năm")).toHaveValue("2003");
  });
});
