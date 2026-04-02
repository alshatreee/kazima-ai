"use client";

import { type FormEvent, useState } from "react";
import { ComposerSection } from "@/components/kazima-ai/ComposerSection";
import { MODES } from "@/components/kazima-ai/data";
import { HeroSection } from "@/components/kazima-ai/HeroSection";
import { ModeSelector } from "@/components/kazima-ai/ModeSelector";
import { ResultsSection } from "@/components/kazima-ai/ResultsSection";
import { SidebarPanels } from "@/components/kazima-ai/SidebarPanels";
import type { AssistantQueryResponse } from "@/lib/kazima-assistant-contract";
import type { Mode } from "@/components/kazima-ai/types";

function serializeResult(result: AssistantQueryResponse): string {
  const parts: string[] = [];

  parts.push(`السؤال: ${result.query}`);
  parts.push(`الوضع: ${result.mode}`);
  parts.push(`النطاق: ${result.scope}`);
  parts.push(`الثقة: ${result.confidence}`);
  parts.push("");
  parts.push(`الخلاصة: ${result.summary}`);
  parts.push("");
  parts.push(result.answer);

  if (result.sections.length > 0) {
    parts.push("");
    parts.push("الأقسام:");
    for (const section of result.sections) {
      parts.push(`${section.title}:`);
      parts.push(section.body);
      parts.push("");
    }
  }

  if (result.citations.length > 0) {
    parts.push("المصادر:");
    for (const citation of result.citations) {
      parts.push(`- ${citation.label}`);
      parts.push(`  ${citation.excerpt}`);
      if (citation.url) parts.push(`  ${citation.url}`);
    }
  }

  return parts.join("\n").trim();
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("retrieve");
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<AssistantQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showContext, setShowContext] = useState(false);

  const activeMode = MODES.find((item) => item.value === mode) ?? MODES[0];
  const resultLineCount = result
    ? serializeResult(result)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean).length
    : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/kazima-assistant/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          mode,
          userIntent: context || undefined,
          includeReadMore: true,
          maxSources: mode === "retrieve" ? 5 : 4,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "حدث خطأ غير متوقع أثناء المعالجة.");
        return;
      }

      setResult(data as AssistantQueryResponse);
    } catch {
      setError("تعذر الاتصال بالخادم في الوقت الحالي.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(serializeResult(result));
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-[30rem] opacity-80"
          style={{
            background:
              "radial-gradient(circle at top, rgba(228, 209, 167, 0.65), transparent 55%)",
          }}
        />
        <div
          className="absolute left-[-8rem] top-32 h-72 w-72 rounded-full opacity-70 blur-3xl"
          style={{ background: "rgba(205, 221, 210, 0.52)" }}
        />
        <div
          className="absolute bottom-10 right-[-6rem] h-80 w-80 rounded-full opacity-60 blur-3xl"
          style={{ background: "rgba(232, 214, 181, 0.42)" }}
        />
      </div>

      <HeroSection
        activeMode={activeMode}
        textLength={text.trim().length}
        resultLineCount={resultLineCount}
      />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_22rem]">
          <div className="space-y-6">
            <ModeSelector mode={mode} onSelect={setMode} />

            <ComposerSection
              activeMode={activeMode}
              text={text}
              context={context}
              showContext={showContext}
              loading={loading}
              onSubmit={handleSubmit}
              onTextChange={setText}
              onContextChange={setContext}
              onToggleContext={() => setShowContext((value) => !value)}
            />

            {error ? (
              <div className="rounded-[1.75rem] border border-[rgba(220, 38, 38, 0.3)] bg-[rgba(254, 242, 242, 0.95)] p-5 text-sm text-[rgba(127, 29, 29, 0.9)]">
                {error}
              </div>
            ) : null}

            <ResultsSection
              activeMode={activeMode}
              loading={loading}
              result={result}
              onCopy={handleCopy}
            />
          </div>

          <SidebarPanels />
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--line)] bg-[rgba(249, 244, 236, 0.56)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-[var(--muted)] sm:flex-row">
          <p>منصة كاظمة البحثية - مساعد ذكي موثق</p>
          <p>© 2025 جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
