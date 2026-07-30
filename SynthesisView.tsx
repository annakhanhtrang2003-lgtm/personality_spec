"use client";

import type { ReactNode } from "react";
import { Chips } from "@/components/worker/ui/Chips";
import { ProgressBar } from "@/components/worker/ui/ProgressBar";
import { poseForType, srcOf } from "../_lib/mascot";
import { dominantPole } from "../_lib/poles";
import type { Dimension, PersonalProfile } from "../_lib/types";
import styles from "./mascot.module.css";

const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium text-worker-text-secondary uppercase">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 list-disc list-inside">
      {items.map((it) => (
        <li key={it} className="text-sm text-worker-primary">{it}</li>
      ))}
    </ul>
  );
}

export function SynthesisView({
  profile,
  actions,
}: {
  profile: PersonalProfile;
  actions?: ReactNode;
}) {
  const { mbti, zodiac, numerology, synthesis, user } = profile;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center text-center gap-2 bg-worker-accent rounded-worker-md px-5 py-7">
        <img
          src={srcOf(poseForType(mbti.type))}
          alt={`Mascot ${mbti.type}`}
          className={`w-40 h-40 object-contain ${styles.popIn}`}
        />
        <h1 className="text-[32px] font-medium text-worker-primary leading-none">{mbti.type}</h1>
        <p className="text-base text-worker-primary">{mbti.label}</p>
        <p className="text-sm text-worker-text-secondary">
          {user.name} · {zodiac.sun_sign} · Số {numerology.life_path}
        </p>
      </div>

      <Section title="Bốn chiều của bạn">
        <div className="flex flex-col gap-3">
          {DIMENSIONS.map((dimension) => {
            const { name, percent } = dominantPole(dimension, mbti.dimensions[dimension]);
            return (
              <div key={dimension} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm text-worker-primary">
                  <span>{name}</span>
                  <span>{percent}%</span>
                </div>
                <ProgressBar value={percent} />
              </div>
            );
          })}
        </div>
      </Section>

      <p className="text-base text-worker-primary">{synthesis.narrative}</p>

      <Section title="Từ khóa">
        <div className="flex flex-wrap gap-2">
          {synthesis.personality_keywords.map((k) => (
            <Chips key={k} label={k} variant="outline" size="sm" />
          ))}
        </div>
      </Section>

      <Section title="Điểm mạnh">
        <List items={synthesis.strengths} />
      </Section>

      <Section title="Có thể để ý thêm">
        <List items={synthesis.growth_areas} />
      </Section>

      <Section title="Hướng nghề gợi mở">
        <List items={synthesis.career_hints} />
      </Section>

      <Section title={`Cung ${zodiac.sun_sign}`}>
        <p className="text-sm text-worker-primary">{zodiac.traits.join(" · ")}</p>
      </Section>

      <Section title="Thần số học">
        <div className="flex flex-col gap-2 text-sm text-worker-primary">
          <p>Số Chủ Đạo {numerology.life_path}: {numerology.interpretations.life_path}</p>
          <p>Số Sứ Mệnh {numerology.expression}: {numerology.interpretations.expression}</p>
          <p>Số Linh Hồn {numerology.soul_urge}: {numerology.interpretations.soul_urge}</p>
          <p>Số Nhân Cách {numerology.personality}: {numerology.interpretations.personality}</p>
        </div>
      </Section>

      {actions}
    </div>
  );
}
