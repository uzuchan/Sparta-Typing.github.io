import { useEffect, useRef } from "react";
import type { Direction } from "../../types";

type Opts = {
  enabled: boolean;
  direction: Direction;
  onChar: (ch: string) => void;
  onBackspace: () => void;
  onEscape: () => void;
};

function allowedChar(direction: Direction, key: string): boolean {
  const k = key.toLowerCase();
  if (k.length !== 1) return false;
  if (direction === "en_to_ja") return /^[a-z\-\u3041-\u309f\u30a1-\u30ff\uff66-\uff9f]$/.test(k);
  return /^[a-z0-9\- ]$/.test(k);
}

export function useTypingInput(opts: Opts) {
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const lastValueRef = useRef("");
  const composingRef = useRef(false);

  const acceptText = (text: string) => {
    for (const ch of text) {
      const k = ch.toLowerCase();
      if (allowedChar(opts.direction, k)) opts.onChar(k);
    }
  };

  // physical keyboard
  useEffect(() => {
    if (!opts.enabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        opts.onEscape();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        opts.onBackspace();
        return;
      }
      if (e.isComposing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (!allowedChar(opts.direction, k)) return;
      e.preventDefault();
      opts.onChar(k);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts.enabled, opts.direction, opts.onChar, opts.onBackspace, opts.onEscape]);

  // mobile hidden input: diff its value char by char
  const onHiddenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (composingRef.current) return;

    const value = e.target.value;
    const prev = lastValueRef.current;

    if (value.length < prev.length) {
      opts.onBackspace();
    } else {
      acceptText(value.slice(prev.length));
    }
    // reset to keep it from growing; keeps IME off
    lastValueRef.current = "";
    e.target.value = "";
  };

  const onCompositionStart = () => {
    composingRef.current = true;
  };

  const onCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    acceptText(e.currentTarget.value);
    lastValueRef.current = "";
    e.currentTarget.value = "";
  };

  const focusHidden = () => {
    hiddenRef.current?.focus();
  };

  const hiddenInputProps = {
    ref: hiddenRef,
    type: "text",
    inputMode: "text" as const,
    autoComplete: "off",
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: false,
    "aria-label": "typing input",
    tabIndex: -1,
    onChange: onHiddenChange,
    onCompositionStart,
    onCompositionEnd,
    style: {
      position: "absolute" as const,
      opacity: 0,
      pointerEvents: "none" as const,
      height: 1,
      width: 1,
      fontSize: 16,
    },
  };

  return { hiddenInputProps, focusHidden };
}
