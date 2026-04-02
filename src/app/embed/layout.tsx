import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "بحث كاظمة",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
            background: transparent;
            color: #1f2824;
          }

          .embed-root { padding: 0.5rem; }

          .embed-form { width: 100%; }
          .embed-bar {
            display: flex;
            align-items: center;
            background: #1e2e28;
            border: 2px solid rgba(231,213,176,0.15);
            border-radius: 999px;
            padding: 0.3rem 0.3rem 0.3rem 0.65rem;
            box-shadow: 0 4px 20px rgba(30,46,40,0.15);
            transition: border-color 0.2s;
          }
          .embed-bar:focus-within {
            border-color: rgba(139,106,59,0.45);
          }
          .embed-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #fff;
            font-size: 0.95rem;
            padding: 0.6rem 0.4rem;
            direction: rtl;
          }
          .embed-input::placeholder { color: rgba(231,213,176,0.45); }
          .embed-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            border: none;
            background: rgba(231,213,176,0.15);
            color: rgba(231,213,176,0.8);
            cursor: pointer;
            transition: background 0.2s;
            flex-shrink: 0;
          }
          .embed-btn:hover:not(:disabled) { background: rgba(231,213,176,0.28); color: #fff; }
          .embed-btn:disabled { opacity: 0.35; cursor: not-allowed; }

          .embed-spinner {
            width: 16px; height: 16px;
            border: 2.5px solid rgba(231,213,176,0.2);
            border-top-color: rgba(231,213,176,0.8);
            border-radius: 50%;
            animation: espin 0.7s linear infinite;
          }
          @keyframes espin { to { transform: rotate(360deg); } }

          .embed-results { margin-top: 0.75rem; }

          .embed-error {
            background: rgba(254,242,242,0.95);
            border: 1px solid rgba(220,38,38,0.2);
            border-radius: 0.75rem;
            padding: 0.75rem 1rem;
            color: rgba(127,29,29,0.85);
            font-size: 0.85rem;
            text-align: center;
          }

          .embed-loading {
            display: flex;
            justify-content: center;
            gap: 0.4rem;
            padding: 1.5rem 0;
          }
          .embed-dot {
            width: 8px; height: 8px;
            background: #304a40;
            border-radius: 50%;
            animation: edot 1.2s ease-in-out infinite;
          }
          .embed-dot:nth-child(2) { animation-delay: 0.15s; }
          .embed-dot:nth-child(3) { animation-delay: 0.3s; }
          @keyframes edot {
            0%,80%,100% { transform: scale(0.6); opacity: 0.35; }
            40% { transform: scale(1); opacity: 1; }
          }

          .embed-result-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .embed-card {
            background: rgba(255,252,247,0.92);
            border: 1px solid rgba(45,55,48,0.1);
            border-radius: 1rem;
            padding: 1rem 1.15rem;
            font-size: 0.88rem;
            line-height: 1.85;
            white-space: pre-wrap;
          }
          .embed-card strong {
            display: block;
            color: #304a40;
            margin-bottom: 0.3rem;
            font-size: 0.92rem;
          }
          .embed-summary { font-weight: 500; }

          .embed-citations { display: flex; flex-direction: column; gap: 0.5rem; }
          .embed-citations-title {
            font-size: 0.88rem;
            font-weight: 600;
            color: #304a40;
          }
          .embed-cite {
            background: rgba(48,74,64,0.04);
            border: 1px solid rgba(48,74,64,0.1);
            border-radius: 0.75rem;
            padding: 0.75rem 1rem;
          }
          .embed-cite-label { font-size: 0.85rem; font-weight: 600; }
          .embed-cite-text { font-size: 0.78rem; color: #6b7370; line-height: 1.65; margin-top: 0.25rem; }
          .embed-cite-link {
            display: inline-block;
            margin-top: 0.35rem;
            font-size: 0.78rem;
            color: #8b6a3b;
            text-decoration: none;
          }
          .embed-cite-link:hover { text-decoration: underline; }

          .embed-readmore { display: flex; flex-direction: column; gap: 0.35rem; }
          .embed-readmore-link {
            display: block;
            background: rgba(255,255,255,0.6);
            border: 1px solid rgba(45,55,48,0.1);
            border-radius: 0.6rem;
            padding: 0.6rem 0.85rem;
            font-size: 0.82rem;
            color: #304a40;
            font-weight: 500;
            text-decoration: none;
            transition: background 0.15s;
          }
          .embed-readmore-link:hover { background: #fff; }

          .embed-followup { display: flex; flex-wrap: wrap; gap: 0.4rem; }
          .embed-followup-btn {
            background: rgba(139,106,59,0.07);
            border: 1px solid rgba(139,106,59,0.14);
            border-radius: 999px;
            padding: 0.45rem 0.85rem;
            font-size: 0.78rem;
            color: #1f2824;
            cursor: pointer;
            transition: background 0.15s;
            text-align: right;
          }
          .embed-followup-btn:hover { background: rgba(139,106,59,0.14); }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
