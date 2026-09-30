import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingForm } from "../OnboardingForm";
import type { Input } from "../../_lib/state";

const emptyInput: Input = { name: "", full_name: "", university: "", birth_date: "" };

describe("OnboardingForm", () => {
  it("renders a university option sourced from the data file", () => {
    render(<OnboardingForm onBack={() => {}} input={emptyInput} errors={{}} onChange={() => {}} onSubmit={() => {}} />);
    // UEH is the first university id in the data file.
    expect(screen.getByRole("option", { name: /Kinh tế TP\.HCM/i })).toBeInTheDocument();
  });

  it("shows an error message when one is passed", () => {
    render(
      <OnboardingForm onBack={() => {}}
        input={emptyInput}
        errors={{ name: "Cho mình biết tên bạn nhé." }}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText("Cho mình biết tên bạn nhé.")).toBeInTheDocument();
  });

  it("calls onChange when the display name is typed", () => {
    const onChange = vi.fn();
    render(<OnboardingForm onBack={() => {}} input={emptyInput} errors={{}} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/tên bạn muốn hiển thị/i), {
      target: { value: "An" },
    });
    expect(onChange).toHaveBeenCalledWith("name", "An");
  });

  it("calls onSubmit when the submit button is clicked", () => {
    const onSubmit = vi.fn();
    render(<OnboardingForm onBack={() => {}} input={emptyInput} errors={{}} onChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /bắt đầu/i }));
    expect(onSubmit).toHaveBeenCalled();
  });
});

describe("OnboardingForm birth date", () => {
  const withDate = (birth_date: string): Input => ({
    name: "", full_name: "", university: "", birth_date,
  });

  it("offers day, month and year selects instead of a calendar popover", () => {
    render(<OnboardingForm onBack={() => {}} input={withDate("")} errors={{}} onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByLabelText("Ngày")).toBeInTheDocument();
    expect(screen.getByLabelText("Tháng")).toBeInTheDocument();
    expect(screen.getByLabelText("Năm")).toBeInTheDocument();
  });

  it("lists years newest first, back to 1990", () => {
    render(<OnboardingForm onBack={() => {}} input={withDate("")} errors={{}} onChange={() => {}} onSubmit={() => {}} />);
    const year = screen.getByLabelText("Năm") as HTMLSelectElement;
    const values = Array.from(year.options).map((o) => o.value).filter(Boolean);
    expect(values[0]).toBe("2012");
    expect(values[values.length - 1]).toBe("1990");
  });

  it("emits an ISO date once all three parts are chosen", () => {
    const onChange = vi.fn();
    // Day and month already chosen; choosing the year completes the date.
    render(<OnboardingForm onBack={() => {}} input={withDate("")} errors={{}} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText("Ngày"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Tháng"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Năm"), { target: { value: "2004" } });
    expect(onChange).toHaveBeenLastCalledWith("birth_date", "2004-03-05");
  });

  it("emits an empty date while the selection is incomplete", () => {
    const onChange = vi.fn();
    render(<OnboardingForm onBack={() => {}} input={withDate("")} errors={{}} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText("Ngày"), { target: { value: "5" } });
    expect(onChange).toHaveBeenLastCalledWith("birth_date", "");
  });

  it("shrinks the day list to fit the chosen month", () => {
    render(<OnboardingForm onBack={() => {}} input={withDate("2004-02-10")} errors={{}} onChange={() => {}} onSubmit={() => {}} />);
    const day = screen.getByLabelText("Ngày") as HTMLSelectElement;
    const values = Array.from(day.options).map((o) => o.value).filter(Boolean);
    expect(values).toHaveLength(29); // February 2004 is a leap February
  });

  it("drops a day the newly chosen month cannot hold", () => {
    const onChange = vi.fn();
    render(<OnboardingForm onBack={() => {}} input={withDate("2004-01-31")} errors={{}} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText("Tháng"), { target: { value: "4" } });
    // April has no 31st, so the date is incomplete again rather than silently the 30th.
    expect(onChange).toHaveBeenLastCalledWith("birth_date", "");
  });

  it("shows the birth date error", () => {
    render(
      <OnboardingForm onBack={() => {}}
        input={withDate("")}
        errors={{ birth_date: "Chọn đủ ngày, tháng và năm." }}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText("Chọn đủ ngày, tháng và năm.")).toBeInTheDocument();
  });
});

describe("OnboardingForm frame", () => {
  it("calls onBack from the '← Quay lại' link", () => {
    const onBack = vi.fn();
    render(
      <OnboardingForm input={emptyInput} errors={{}} onChange={() => {}} onSubmit={() => {}} onBack={onBack} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("does not submit the form when going back", () => {
    const onSubmit = vi.fn();
    render(
      <OnboardingForm input={emptyInput} errors={{}} onChange={() => {}} onSubmit={onSubmit} onBack={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the heading text whole for assistive tech", () => {
    render(
      <OnboardingForm input={emptyInput} errors={{}} onChange={() => {}} onSubmit={() => {}} onBack={() => {}} />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Khám phá bản thân");
  });
});
