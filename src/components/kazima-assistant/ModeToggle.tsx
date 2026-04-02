import type { AssistantMode } from "./types";

type ModeToggleProps = {
  mode: AssistantMode;
  onSelect: (mode: AssistantMode) => void;
};

export function ModeToggle({ mode, onSelect }: ModeToggleProps) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.6)]">
      <button
        type="button"
        onClick={() => onSelect("brief")}
        className={`px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
          mode === "brief"
            ? "rounded-full bg-[var(--sage)] text-white"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        مختصر
      </button>
      <button
        type="button"
        onClick={() => onSelect("research")}
        className={`px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
          mode === "research"
            ? "rounded-full bg-[var(--sage)] text-white"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        بحثي
      </button>
    </div>
  );
}
