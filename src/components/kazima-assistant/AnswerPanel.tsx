import type { AssistantResponse } from "./types";
import { Indicator } from "./Indicator";

type AnswerPanelProps = {
  response: AssistantResponse;
};

/**
 * Tiny, dependency-free markdown-lite renderer.
 *
 * Supports:
 *  • Paragraph splits (blank line)
 *  • # / ## / ### headings
 *  • Unordered list items (- foo, * foo)
 *  • Ordered list items (1. foo)
 *  • **bold** and *italic*
 *  • Inline citation markers like (1) (2) — rendered as pill superscripts
 *
 * No HTML is injected from the model. We escape every text node and only
 * the formatting tags we emit are allowed. Output is wrapped in an RTL
 * container so Claude's Arabic prose flows correctly.
 */

type Span = { type: "text" | "cite" | "bold" | "italic"; value: string };

function escapeText(t: string): string {
  // Already safe — React escapes children. Kept for documentation purposes.
  return t;
}

function tokenizeInline(line: string): Span[] {
  // First, split on citation markers (1)..(99) so they survive bold/italic.
  const citeRe = /\((\d{1,2})\)/g;
  const out: Span[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = citeRe.exec(line)) !== null) {
    if (m.index > lastIdx) {
      out.push({ type: "text", value: line.slice(lastIdx, m.index) });
    }
    out.push({ type: "cite", value: m[1] });
    lastIdx = citeRe.lastIndex;
  }
  if (lastIdx < line.length) {
    out.push({ type: "text", value: line.slice(lastIdx) });
  }

  // Then expand bold/italic inside text spans.
  const expanded: Span[] = [];
  for (const span of out) {
    if (span.type !== "text") {
      expanded.push(span);
      continue;
    }
    const parts: Span[] = [];
    const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
    let li = 0;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(span.value)) !== null) {
      if (mm.index > li) parts.push({ type: "text", value: span.value.slice(li, mm.index) });
      if (mm[2]) parts.push({ type: "bold", value: mm[2] });
      else if (mm[4]) parts.push({ type: "italic", value: mm[4] });
      li = re.lastIndex;
    }
    if (li < span.value.length) parts.push({ type: "text", value: span.value.slice(li) });
    expanded.push(...parts);
  }
  return expanded;
}

function renderInline(line: string, keyBase: string): React.ReactNode[] {
  return tokenizeInline(line).map((s, i) => {
    const k = `${keyBase}-${i}`;
    if (s.type === "cite") {
      return (
        <sup
          key={k}
          className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sage)] px-1.5 text-[0.7rem] font-semibold text-white"
          title={`المصدر رقم ${s.value}`}
        >
          {s.value}
        </sup>
      );
    }
    if (s.type === "bold") return <strong key={k} className="font-semibold">{escapeText(s.value)}</strong>;
    if (s.type === "italic") return <em key={k}>{escapeText(s.value)}</em>;
    return <span key={k}>{escapeText(s.value)}</span>;
  });
}

function MarkdownLite({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const nodes: React.ReactNode[] = [];
  blocks.forEach((raw, bi) => {
    const block = raw.trim();
    if (!block) return;
    const lines = block.split("\n").map((l) => l.trimEnd());

    // Heading?
    const h = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
    if (h && lines.length === 1) {
      const level = h[1].length;
      const cls =
        level === 1
          ? "mt-2 mb-3 text-lg font-semibold text-[var(--foreground)]"
          : level === 2
          ? "mt-2 mb-2 text-base font-semibold text-[var(--foreground)]"
          : "mt-2 mb-2 text-[0.95rem] font-semibold text-[var(--sage)]";
      nodes.push(
        <p key={`h-${bi}`} className={cls}>
          {renderInline(h[2], `h-${bi}`)}
        </p>,
      );
      return;
    }

    // Unordered list?
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      nodes.push(
        <ul key={`ul-${bi}`} className="mb-3 list-inside list-disc space-y-1.5 pr-2">
          {lines.map((l, li) => (
            <li key={`ul-${bi}-${li}`} className="leading-8">
              {renderInline(l.replace(/^\s*[-*]\s+/, ""), `ul-${bi}-${li}`)}
            </li>
          ))}
        </ul>,
      );
      return;
    }

    // Ordered list?
    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      nodes.push(
        <ol key={`ol-${bi}`} className="mb-3 list-inside list-decimal space-y-1.5 pr-2">
          {lines.map((l, li) => (
            <li key={`ol-${bi}-${li}`} className="leading-8">
              {renderInline(l.replace(/^\s*\d+\.\s+/, ""), `ol-${bi}-${li}`)}
            </li>
          ))}
        </ol>,
      );
      return;
    }

    // Default: paragraph (single \n becomes space-separated within paragraph).
    const joined = lines.join(" ");
    nodes.push(
      <p key={`p-${bi}`} className="mb-3 leading-8 last:mb-0">
        {renderInline(joined, `p-${bi}`)}
      </p>,
    );
  });

  return <div dir="rtl" className="kazima-prose text-right">{nodes}</div>;
}

export function AnswerPanel({ response }: AnswerPanelProps) {
  const hasAnswer = response.answer.trim().length > 0;
  const hasSections = response.sections.length > 0;

  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            إجابة المساعد
          </p>
          {response.summary ? (
            <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
              {response.summary.length > 80
                ? response.summary.substring(0, 80) + "..."
                : response.summary}
            </h3>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Indicator type="scope" value={response.scope} />
          <Indicator type="confidence" value={response.confidence} />
        </div>
      </div>

      {/* Synthesized answer (Phase 2A) — always render above sources when present */}
      {hasAnswer ? (
        <div className="mb-5 rounded-[1.75rem] border border-[var(--line)] bg-[rgba(255,255,255,0.85)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="kazima-pill">إجابة موجزة من Claude</span>
            <span className="kazima-pill">يستحسن المراجعة البشرية</span>
          </div>
          <div className="kazima-scroll max-h-[34rem] overflow-auto text-sm text-[var(--foreground)] sm:text-[0.95rem]">
            <MarkdownLite text={response.answer} />
          </div>
        </div>
      ) : null}

      {/* Sections (research mode) */}
      {hasSections ? (
        <div className="space-y-4">
          {response.sections.map((section) => (
            <div
              key={section.title}
              className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.55)] p-4 sm:p-5"
            >
              <h4 className="mb-3 text-[0.95rem] font-semibold text-[var(--sage)]">
                {section.title}
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-8 text-[var(--foreground)]">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Disclaimers */}
      {response.disclaimers && response.disclaimers.length > 0 ? (
        <div className="mt-5 space-y-2">
          {response.disclaimers.map((disclaimer) => (
            <div
              key={disclaimer}
              className="rounded-[1.25rem] border border-[rgba(139,106,59,0.14)] bg-[rgba(255,249,239,0.7)] px-4 py-3 text-xs leading-7 text-[var(--muted)]"
            >
              {disclaimer}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
