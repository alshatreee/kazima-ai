import type { AssistantScope, ConfidenceLevel } from "./types";
import {
  SCOPE_LABELS,
  SCOPE_STYLES,
  CONFIDENCE_LABELS,
  CONFIDENCE_STYLES,
} from "./data";

type IndicatorProps = {
  type: "scope" | "confidence";
  value: AssistantScope | ConfidenceLevel;
};

export function Indicator({ type, value }: IndicatorProps) {
  const label =
    type === "scope"
      ? SCOPE_LABELS[value as AssistantScope]
      : CONFIDENCE_LABELS[value as ConfidenceLevel];

  const style =
    type === "scope"
      ? SCOPE_STYLES[value as AssistantScope]
      : CONFIDENCE_STYLES[value as ConfidenceLevel];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: style.bg, color: style.color }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: style.dot }}
      />
      {label}
    </span>
  );
}
