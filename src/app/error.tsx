"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("kazima-ai root error:", error);
  }, [error]);

  return (
    <div dir="rtl" style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem",
      padding: "2rem",
      background: "#0d1421",
      color: "#ECF0F1",
      fontFamily: "Tajawal, -apple-system, sans-serif",
      textAlign: "center",
    }}>
      <h1 style={{ fontSize: "2rem", margin: 0 }}>حدث خطأ غير متوقع</h1>
      <p style={{ color: "#888", maxWidth: 520 }}>
        نعتذر — يبدو أن هناك خللاً مؤقتاً في الخدمة. حاول مرة أخرى بعد قليل.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.75rem 1.6rem",
          borderRadius: 8,
          border: 0,
          background: "#1a3c5e",
          color: "#fff",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        إعادة المحاولة
      </button>
      <a href="/" style={{ color: "#D4AC0D", textDecoration: "none", fontSize: "0.9rem" }}>
        ← الرئيسية
      </a>
    </div>
  );
}
