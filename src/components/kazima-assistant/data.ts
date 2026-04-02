import type { AssistantScope, ConfidenceLevel } from "./types";

export const SCOPE_LABELS: Record<AssistantScope, string> = {
  kazima_primary: "مصدر كاظمة أولي",
  kazima_primary_plus_context: "كاظمة + سياق",
  general_knowledge: "معرفة عامة",
  needs_verification: "يحتاج تحقق",
};

export const SCOPE_STYLES: Record<
  AssistantScope,
  { bg: string; color: string; dot: string }
> = {
  kazima_primary: {
    bg: "rgba(48,74,64,0.12)",
    color: "var(--sage)",
    dot: "#2d6a4f",
  },
  kazima_primary_plus_context: {
    bg: "rgba(48,74,64,0.09)",
    color: "var(--sage)",
    dot: "#2d6a4f",
  },
  general_knowledge: {
    bg: "rgba(139,106,59,0.12)",
    color: "var(--accent-strong)",
    dot: "#8b6a3b",
  },
  needs_verification: {
    bg: "rgba(138,60,43,0.1)",
    color: "var(--danger-ink)",
    dot: "#8a3c2b",
  },
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "ثقة مرتفعة",
  medium: "ثقة متوسطة",
  low: "ثقة منخفضة",
};

export const CONFIDENCE_STYLES: Record<
  ConfidenceLevel,
  { bg: string; color: string; dot: string }
> = {
  high: {
    bg: "rgba(48,74,64,0.12)",
    color: "#2d6a4f",
    dot: "#2d6a4f",
  },
  medium: {
    bg: "rgba(139,106,59,0.12)",
    color: "#8b6a3b",
    dot: "#8b6a3b",
  },
  low: {
    bg: "rgba(138,60,43,0.1)",
    color: "#8a3c2b",
    dot: "#8a3c2b",
  },
};

export const PIPELINE_STEPS = [
  "تحقق من صحة السؤال وتحديد النمط",
  "استرجاع المصادر من قاعدة بيانات كاظمة (RAG)",
  "بناء السياق وإرساله إلى Claude API",
  "تحليل JSON والعرض مع الاستشهادات",
];

export const SCOPE_DESCRIPTIONS: { label: string; desc: string; dot: string }[] = [
  {
    label: "مصدر كاظمة أولي",
    desc: "الإجابة مستمدة مباشرة من محتوى منصة كاظمة.",
    dot: "#2d6a4f",
  },
  {
    label: "كاظمة + سياق",
    desc: "مصدر كاظمة مع سياق تاريخي أو لغوي إضافي.",
    dot: "#8b6a3b",
  },
  {
    label: "يحتاج تحقق",
    desc: "لا تتوفر مصادر كافية — يُنصح بمراجعة مصادر أولية.",
    dot: "#8a3c2b",
  },
];

export const CONFIDENCE_DESCRIPTIONS: { label: string; desc: string; dot: string }[] = [
  {
    label: "مرتفع",
    desc: "مصادر كاظمة واضحة ومتطابقة.",
    dot: "#2d6a4f",
  },
  {
    label: "متوسط",
    desc: "مصادر جزئية أو تحتاج سياق إضافي.",
    dot: "#8b6a3b",
  },
  {
    label: "منخفض",
    desc: "معرفة عامة أو معلومات غير موثقة.",
    dot: "#8a3c2b",
  },
];
