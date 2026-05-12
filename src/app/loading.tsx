export default function Loading() {
  return (
    <div dir="rtl" style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1.25rem",
      background: "#0d1421",
      color: "#ECF0F1",
      fontFamily: "Tajawal, -apple-system, sans-serif",
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: "3px solid rgba(255,255,255,.12)",
        borderTopColor: "#D4AC0D",
        borderRadius: "50%",
        animation: "kz-spin 0.9s linear infinite",
      }} />
      <div style={{ color: "#888", fontSize: "0.95rem" }}>جارٍ التحميل…</div>
      <style>{`@keyframes kz-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
