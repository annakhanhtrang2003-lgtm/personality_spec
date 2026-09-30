import { poseForType, srcOf } from "../../_lib/mascot";
import { temperamentOf, TEMPERAMENTS, type TemperamentId } from "../../_lib/temperament";
import { SCENES } from "./stickerScenes";
import styles from "./sticker.module.css";

/** Kit modifier class per temperament. */
const KIT_CLASS: Record<TemperamentId, string> = {
  analysts: "stk--analyst",
  diplomats: "stk--diplomat",
  sentinels: "stk--sentinel",
  explorers: "stk--explorer",
};

/** Explorers' graffiti word — kit art text, kept in English (spec §5 ①). */
const TAGS: Record<string, string> = { ISTP: "FIX IT", ISFP: "VIBE", ESTP: "GO!", ESFP: "SHOW!" };

/** Kit class name(s) → CSS-module class name(s). Unknown names pass through. */
function cx(...names: string[]): string {
  return names.map((n) => styles[n] ?? n).join(" ");
}

/**
 * The scene markup is the kit's own static SVG (see extract-kit.mjs and
 * stickerScenes.test.ts: no scripts, handlers or external refs), so it is
 * injected as HTML. Its class attributes are rewritten once, at module load,
 * to the module-scoped names.
 */
function localize(html: string): string {
  return html.replace(/class="([^"]*)"/g, (_, names: string) => `class="${cx(...names.split(/\s+/).filter(Boolean))}"`);
}

const LOCAL_SCENES = Object.fromEntries(
  Object.entries(SCENES).map(([id, s]) => [id, { back: localize(s.back), front: localize(s.front) }]),
) as Record<TemperamentId, { back: string; front: string }>;

export function StickerCard({ type }: { type: string }) {
  const id = temperamentOf(type);
  const scene = LOCAL_SCENES[id];
  const front = scene.front.replace("{{TAG}}", TAGS[type] ?? "");

  return (
    <div data-testid="sticker-card" data-type={type} className={cx("stk", KIT_CLASS[id])}>
      <svg
        className={cx("stk__layer", "stk__back")}
        viewBox="0 0 300 360"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: scene.back }}
      />
      <img className={cx("stk__mascot")} src={srcOf(poseForType(type))} alt={`Linh vật ${type}`} />
      <svg
        className={cx("stk__layer", "stk__front")}
        viewBox="0 0 300 360"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: front }}
      />
      <div data-testid="sticker-badge" className={cx("stk__badge")}>
        <b>{type}</b>
        <span>{TEMPERAMENTS[id].name}</span>
      </div>
    </div>
  );
}
