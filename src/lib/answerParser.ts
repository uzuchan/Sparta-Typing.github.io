import type { AnswerSegment } from "../types";

export function parseAnswerRaw(raw: string): AnswerSegment[] {
  return raw
    .trim()
    .split("/")
    .filter(Boolean)
    .map((part) => {
      const colonIndex = part.indexOf(":");

      if (colonIndex === -1) {
        return {
          display: part,
          reading: part,
        };
      }

      return {
        display: part.slice(0, colonIndex),
        reading: part.slice(colonIndex + 1),
      };
    });
}

export function getAnswerDisplay(raw: string): string {
  return parseAnswerRaw(raw)
    .map((segment) => segment.display)
    .join("");
}

export function getAnswerReading(raw: string): string {
  return parseAnswerRaw(raw)
    .map((segment) => segment.reading)
    .join("");
}
