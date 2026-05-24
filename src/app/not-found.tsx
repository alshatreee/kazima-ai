export default function NotFound() {
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
      <div style={{ fontSize: "4.5rem", lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: "1.6rem", margin: 0 }}>الصفحة غير موجودة</h1>
      <p style={{ color: "#888", maxWidth: 520 }}>
        لم نتمكن من العثور على ما تبحث عنه. قد يكون الرابط غير صحيح أو الصفحة نُقلت.
      </p>
      <a href="/" style={{
        marginTop: "0.5rem",
        padding: "0.75rem 1.6rem",
        borderRadius: 8,
        background: "#1a3c5e",
        color: "#fff",
        textDecoration: "none",
      }}>← الرئيسية</a>
    </div>
  );
}
