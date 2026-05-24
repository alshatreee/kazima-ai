"use client";

import { type FormEvent, useState } from "react";
import type {
  AssistantMode,
  AssistantResponse,
} from "@/components/kazima-assistant/types";
import { AssistantHeader } from "@/components/kazima-assistant/AssistantHeader";
import { QueryComposer } from "@/components/kazima-assistant/QueryComposer";
import { EmptyState } from "@/components/kazima-assistant/EmptyState";
import { LoadingSkeleton } from "@/components/kazima-assistant/LoadingSkeleton";
import { AnswerPanel } from "@/components/kazima-assistant/AnswerPanel";
import { CitationsPanel } from "@/components/kazima-assistant/CitationsPanel";
import { FollowUpPanel } from "@/components/kazima-assistant/FollowUpPanel";
import { AssistantSidebar } from "@/components/kazima-assistant/AssistantSidebar";

export default function AssistantPage() {
  const [mode, setMode] = useState<AssistantMode>("brief");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<AssistantResponse | null>(null);

  const sourcesCount = response?.retrieval.returnedSources ?? 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/kazima-assistant/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          mode,
          maxSources: 5,
          includeReadMore: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حدث خطأ غير متوقع أثناء المعالجة.");
        return;
      }

      setResponse(data as AssistantResponse);
    } catch {
      setError("تعذر الاتصال بالخادم في الوقت الحالي.");
    } finally {
      setLoading(false);
    }
  }

  function handleFollowUp(question: string) {
    setQuery(question);
    setResponse(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--foreground)]">
      {/* Background decorations */}
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

      <AssistantHeader
        queryLength={query.trim().length}
        sourcesCount={sourcesCount}
      />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_22rem]">
          <div className="space-y-6">
            <QueryComposer
              mode={mode}
              query={query}
              loading={loading}
              onModeChange={setMode}
              onQueryChange={setQuery}
              onSubmit={handleSubmit}
            />

            {error ? (
              <div className="rounded-[1.75rem] border border-[rgba(138,60,43,0.16)] bg-[var(--danger-soft)] px-5 py-4 text-sm leading-7 text-[var(--danger-ink)]">
                {error}
              </div>
            ) : null}

            {loading ? (
              <LoadingSkeleton />
            ) : response ? (
              <>
                <AnswerPanel response={response} />
                <CitationsPanel citations={response.citations} />
                <FollowUpPanel
                  questions={response.followUpQuestions}
                  onSelect={handleFollowUp}
                />
              </>
            ) : (
              <EmptyState />
            )}
          </div>

          <AssistantSidebar />
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--line)] bg-[rgba(245,239,228,0.72)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            مساعد كاظمة العلمي — باحث في التراث الديني الخليجي والمخطوطات
            والنشر الأكاديمي.
          </p>
          <p className="tracking-[0.2em] text-[var(--accent-strong)]">
            KAZIMA.ORG
          </p>
        </div>
      </footer>
    </div>
  );
}
