"use client";

import { forwardRef } from "react";
import { poseForType, srcOf } from "../_lib/mascot";
import type { PersonalProfile } from "../_lib/types";

/** 4:5 — the tallest ratio Instagram and Facebook feeds accept uncropped. */
const WIDTH = 1080;
const HEIGHT = 1350;

/**
 * Deliberately not the on-screen card. That one is a responsive column; this
 * is a fixed canvas with absolute type sizes, so the exported PNG looks the
 * same regardless of the device it was made on. Inline styles rather than
 * Tailwind: the rasteriser copies computed styles, and utility classes that
 * depend on viewport breakpoints would resolve against the phone, not the card.
 */
export const ShareCard = forwardRef<HTMLDivElement, { profile: PersonalProfile }>(
  function ShareCard({ profile }, ref) {
    const { mbti, zodiac, numerology, user, synthesis } = profile;

    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          padding: "72px 64px",
          boxSizing: "border-box",
          background: "linear-gradient(160deg, #FFF0F7 0%, #FFE1EF 100%)",
          fontFamily: "inherit",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "36px", color: "#8E8E93", margin: 0 }}>{user.name}</p>

        <img
          src={srcOf(poseForType(mbti.type))}
          alt={`Mascot ${mbti.type}`}
          style={{ width: "520px", height: "520px", objectFit: "contain" }}
        />

        <p style={{ fontSize: "120px", fontWeight: 600, color: "#A50064", margin: 0, lineHeight: 1 }}>
          {mbti.type}
        </p>

        <p style={{ fontSize: "44px", color: "#A50064", margin: 0 }}>{mbti.label}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
          {synthesis.personality_keywords.slice(0, 3).map((keyword) => (
            <span
              key={keyword}
              data-testid="share-keyword"
              style={{
                fontSize: "32px",
                color: "#A50064",
                border: "2px solid #A50064",
                borderRadius: "999px",
                padding: "8px 24px",
              }}
            >
              {keyword}
            </span>
          ))}
        </div>

        <p style={{ fontSize: "32px", color: "#8E8E93", margin: 0 }}>
          {zodiac.sun_sign} · Số chủ đạo {numerology.life_path}
        </p>
      </div>
    );
  },
);
