"use client";

import { HERO_MASCOT } from "../../_lib/partTheme";
import { srcOf } from "../../_lib/mascot";
import { PREVIEW_ID } from "./QuizPreview";
import styles from "./onboarding.module.css";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Static v2 hero — no time-of-day greeting, no typing effect (spec §5.1).
 * `min-h`, not `h`: on a 568px-tall phone the content is taller than the
 * viewport and must push the section, not be clipped by it.
 */
export function Hero() {
  // An in-page scroll, not a phase change. scrollIntoView is optional-called
  // because jsdom and some old WebViews lack it; the preview is directly
  // below, so a no-op still leaves the student one swipe away.
  const toPreview = () => {
    document
      .getElementById(PREVIEW_ID)
      ?.scrollIntoView?.({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    <section
      aria-labelledby="pd-hero-title"
      className="relative isolate overflow-hidden min-h-[100svh] flex items-center justify-center px-6 pt-10 pb-16 bg-[linear-gradient(180deg,#ffe4e6,#fdf2f8_50%,#ede9fe)]"
    >
      <div aria-hidden className="absolute -z-10 -left-[90px] -top-[60px] w-[240px] h-[240px] rounded-full blur-[56px] bg-[rgba(255,255,255,.55)]" />
      <div aria-hidden className="absolute -z-10 -right-[90px] -bottom-[60px] w-[280px] h-[280px] rounded-full blur-[56px] bg-[rgba(224,242,254,.75)]" />

      <div className="w-full max-w-[420px] flex flex-col items-center gap-6 text-center">
        <div className={styles.float}>
          <img
            src={srcOf(HERO_MASCOT)}
            alt=""
            className="h-[200px] w-auto object-contain drop-shadow-[0_16px_24px_rgba(184,6,102,.22)]"
          />
        </div>
        <div aria-hidden className={`-mt-4 w-[90px] h-[11px] rounded-full bg-[rgba(131,24,67,.1)] blur-[4px] ${styles.floatShadow}`} />

        <h1
          id="pd-hero-title"
          className={`text-[27px] leading-[1.25] font-extrabold text-[#1e293b] text-balance ${styles.fadeUp}`}
        >
          Giữa thế giới ai cũng đang rực rỡ…{" "}
          <span className="bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] bg-clip-text text-transparent">
            Bạn có đang lạc lối?
          </span>
        </h1>

        <p className={`text-[15.5px] leading-[1.65] text-[#475569] text-pretty ${styles.fadeUp} ${styles.delay1}`}>
          Cảm giác chênh vênh chỉ là trạm dừng chân đầu tiên. Hãy để sự thấu hiểu bản thân dẫn lối cho bạn bước tiếp.
        </p>

        <button
          type="button"
          onClick={toPreview}
          className={`inline-flex items-center justify-center gap-2 w-full max-w-[320px] px-5 py-4 rounded-full bg-[#0f172a] text-white text-base font-bold shadow-[0_10px_22px_-6px_rgba(236,72,153,.35)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f9a8d4] ${styles.fadeUp} ${styles.delay2}`}
        >
          Bắt đầu hành trình của bạn
          <span aria-hidden>↓</span>
        </button>
      </div>
    </section>
  );
}
