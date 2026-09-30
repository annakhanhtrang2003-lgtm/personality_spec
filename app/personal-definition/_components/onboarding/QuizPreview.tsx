"use client";

import { useRef, useState } from "react";
import { PART_THEMES } from "../../_lib/partTheme";
import { PART_SIZE } from "../../_lib/parts";
import { QUESTION_COUNT } from "../../_lib/likert";
import { srcOf } from "../../_lib/mascot";

export const PREVIEW_ID = "pd-quiz-preview";

/** Card copy per part, index = part (same order as PART_THEMES). */
const CARDS = [
  {
    title: "Sóng não cực mạnh hay cần sạc pin?",
    desc: "Khám phá cách bạn nạp năng lượng: Trùm tiệc tùng hay chỉ muốn chill một mình?",
  },
  {
    title: "Thực tế phũ phàng hay hệ tâm linh?",
    desc: "Cách bạn nhìn nhận thế giới: Tin vào mắt thấy tai nghe hay thích \"đọc vị\" ẩn giấu?",
  },
  {
    title: "Não nhảy số hay tim lên tiếng?",
    desc: "Khi đứng giữa ngã rẽ: Dùng logic thép phân tích hay nghe theo tiếng gọi con tim?",
  },
  {
    title: "Kế hoạch 5 năm hay nước đến chân mới nhảy?",
    desc: "Phong cách sống: Team \"deadline là chân ái\" hay team linh hoạt ứng biến?",
  },
] as const;

/** Track's inline padding; card offsets are measured from it. */
const TRACK_PAD = 24;

export function QuizPreview({ onStart }: { onStart: () => void }) {
  const trackRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  const syncActive = () => {
    const track = trackRef.current;
    if (!track) return;
    let best = 0;
    let dist = Infinity;
    Array.from(track.children).forEach((li, i) => {
      const d = Math.abs((li as HTMLElement).offsetLeft - TRACK_PAD - track.scrollLeft);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setActive(best);
  };

  // Element.scrollTo is optional-called: jsdom and some old WebViews lack it.
  // `active` is set directly so the dot reflects the choice either way.
  const goTo = (i: number) => {
    const track = trackRef.current;
    const li = track?.children[i] as HTMLElement | undefined;
    if (track && li) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo?.({ left: li.offsetLeft - TRACK_PAD, behavior: reduce ? "auto" : "smooth" });
    }
    setActive(i);
  };

  return (
    <section
      id={PREVIEW_ID}
      aria-labelledby="pd-qp-title"
      className="relative -mt-8 bg-white rounded-t-[28px] pt-9 pb-10 shadow-[0_-8px_24px_rgba(131,24,67,.06)]"
    >
      <div className="max-w-[600px] mx-auto">
        <header className="px-6">
          <p className="text-xs font-semibold tracking-[.12em] uppercase text-[#ec4899]">
            {QUESTION_COUNT} câu hỏi · {PART_THEMES.length} phần
          </p>
          <h2 id="pd-qp-title" className="mt-2 text-[23px] leading-[1.25] font-extrabold text-[#1e293b] text-balance">
            Hành trình “bóc tách” bản thân
          </h2>
          <p className="mt-2 text-sm leading-[1.6] text-[#475569]">
            Không có đáp án đúng sai, chỉ có đáp án thật lòng.
          </p>
        </header>

        <ol
          ref={trackRef}
          tabIndex={0}
          aria-label="4 phần của bài test, vuốt ngang để xem"
          onScroll={() => window.requestAnimationFrame(syncActive)}
          className="relative mt-5 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-6 px-6 pt-1.5 pb-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-[#ec4899] focus-visible:-outline-offset-2 rounded-xl"
        >
          {PART_THEMES.map((t, i) => (
            <li key={t.letters.join("")} className="flex-[0_0_82%] snap-start flex">
              <article
                aria-labelledby={`pd-qp-${i}`}
                className="w-full flex flex-col p-3.5 rounded-[24px]"
                style={{ backgroundColor: t.bg, boxShadow: `0 0 0 1px ${t.ring}, 0 6px 14px rgba(148,163,184,.18)` }}
              >
                <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden flex items-end justify-center" style={{ background: t.well }}>
                  <img src={srcOf(t.mascot)} alt="" className="h-[88%] w-auto object-contain drop-shadow-[0_10px_14px_rgba(15,23,42,.12)]" />
                  <span
                    className="absolute left-2.5 top-2.5 px-[11px] py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: t.badge, color: t.badgeInk }}
                  >
                    Phần {i + 1} · Câu {i * PART_SIZE + 1}–{(i + 1) * PART_SIZE}
                  </span>
                </div>
                <p className="mt-3 flex items-center flex-wrap gap-1.5 text-xs font-medium">
                  <span className="sr-only">Cặp tính cách:</span>
                  {t.letters.map((letter, k) => (
                    <span key={letter} className="contents">
                      {k === 1 && (
                        <>
                          <span aria-hidden className="text-[#94a3b8]">↔</span>
                          <span className="sr-only">hoặc</span>
                        </>
                      )}
                      <span
                        className="inline-flex items-center gap-[5px] px-[9px] py-1 rounded-full bg-white"
                        style={{ color: t.chip, boxShadow: `0 0 0 1px ${t.ring}` }}
                      >
                        <b className="text-[13px] font-extrabold">{letter}</b>
                        {t.poleNames[k]}
                      </span>
                    </span>
                  ))}
                </p>
                <h3 id={`pd-qp-${i}`} className="mt-2.5 text-[17px] leading-[1.35] font-bold text-[#1e293b] text-balance">
                  {CARDS[i]!.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-[#475569]">{CARDS[i]!.desc}</p>
              </article>
            </li>
          ))}
        </ol>

        <div role="group" aria-label="Chọn phần" className="flex justify-center">
          {PART_THEMES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Phần ${i + 1}`}
              aria-current={i === active ? "true" : "false"}
              onClick={() => goTo(i)}
              className="p-2 focus-visible:outline-2 focus-visible:outline-[#ec4899] rounded-full"
            >
              <span
                className={`block h-2 rounded-full transition-all motion-reduce:transition-none ${i === active ? "w-[22px] bg-[#ec4899]" : "w-2 bg-[#e2c8d6]"}`}
              />
            </button>
          ))}
        </div>
        <p aria-hidden className="mt-1 text-center text-xs text-[#94a3b8]">
          Vuốt ngang để xem cả 4 phần →
        </p>

        <div className="mt-6 px-6">
          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-full py-4 px-6 text-[17px] font-bold text-white bg-[linear-gradient(90deg,#ec4899,#fb7185)] shadow-[0_10px_20px_-6px_rgba(236,72,153,.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f9a8d4]"
          >
            Làm bài test ngay
          </button>
        </div>
      </div>
    </section>
  );
}
