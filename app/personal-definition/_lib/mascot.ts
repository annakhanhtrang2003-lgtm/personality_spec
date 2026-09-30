import pose1 from "../_assets/mascot/kit/pose-1.webp";
import pose2 from "../_assets/mascot/kit/pose-2.webp";
import pose3 from "../_assets/mascot/kit/pose-3.webp";
import pose4 from "../_assets/mascot/kit/pose-4.webp";
import pose5 from "../_assets/mascot/kit/pose-5.webp";
import pose6 from "../_assets/mascot/kit/pose-6.webp";
import pose7 from "../_assets/mascot/kit/pose-7.webp";
import pose8 from "../_assets/mascot/kit/pose-8.webp";

import face01 from "../_assets/mascot/faces/face-01.png";
import face02 from "../_assets/mascot/faces/face-02.png";
import face03 from "../_assets/mascot/faces/face-03.png";
import face04 from "../_assets/mascot/faces/face-04.png";
import face05 from "../_assets/mascot/faces/face-05.png";
import face06 from "../_assets/mascot/faces/face-06.png";
import face07 from "../_assets/mascot/faces/face-07.png";
import face08 from "../_assets/mascot/faces/face-08.png";
import face09 from "../_assets/mascot/faces/face-09.png";
import face10 from "../_assets/mascot/faces/face-10.png";
import face11 from "../_assets/mascot/faces/face-11.png";
import face12 from "../_assets/mascot/faces/face-12.png";
import face13 from "../_assets/mascot/faces/face-13.png";

/**
 * Next resolves a static image import to an object; Vite resolves it to a
 * URL string. Both shapes flow through here so neither environment wins.
 */
export type ImageAsset = string | { src: string };

export function srcOf(asset: ImageAsset): string {
  return typeof asset === "string" ? asset : asset.src;
}

export type FaceName =
  | "grin" | "smile" | "confident" | "playful" | "worried"
  | "yummy" | "laugh" | "surprised" | "excited" | "smirk"
  | "playfulAlt" | "laughAlt" | "kiss";

/** Sheet order is row-major, matching slice-sheet.ps1 output. */
export const FACES: Record<FaceName, ImageAsset> = {
  grin: face01,
  smile: face02,
  confident: face03,
  playful: face04,
  worried: face05,
  yummy: face06,
  laugh: face07,
  surprised: face08,
  excited: face09,
  smirk: face10,
  playfulAlt: face11,
  laughAlt: face12,
  kiss: face13,
};

/**
 * The Temperament Sticker Kit's map: each pose goes to the two types whose
 * attitude it already shows, deliberately in two *different* temperaments —
 * the temperament scene around the mascot carries the difference.
 */
const POSE_BY_TYPE: Record<string, ImageAsset> = {
  ENTP: pose1, ISFP: pose1, // wink, tongue out, waving
  INFP: pose2, ESFJ: pose2, // giggling, hearts
  INTJ: pose3, INFJ: pose3, // hand on chin, thinking
  ENTJ: pose4, ISTJ: pose4, // fist pump, striding
  ENFP: pose5, ESTP: pose5, // blowing a kiss, running
  INTP: pose6, ISTP: pose6, // sunglasses + popcorn
  ENFJ: pose7, ISFJ: pose7, // big smile, waving
  ESTJ: pose8, ESFP: pose8, // wink in a shopping cart
};

export function poseForType(type: string): ImageAsset {
  const pose = POSE_BY_TYPE[type];
  if (!pose) {
    throw new Error(`poseForType: no mascot pose for MBTI type "${type}"`);
  }
  return pose;
}
