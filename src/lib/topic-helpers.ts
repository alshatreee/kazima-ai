const HTML_TAG_RE = /<[^>]*>/g;
const NBSP_RE = /&nbsp;/g;
const MULTI_SPACE_RE = /\s{2,}/g;

export function stripHtml(html: string): string {
  return html
    .replace(HTML_TAG_RE, "")
    .replace(NBSP_RE, " ")
    .replace(MULTI_SPACE_RE, " ")
    .trim();
}

export function resolveContentType(optionId: number): string {
  switch (optionId) {
    case 2:
      return "كتب ومخطوطات";
    case 3:
      return "تراجم وسير";
    default:
      return "مقالات";
  }
}

export function resolveContentRoute(optionId: number): string {
  switch (optionId) {
    case 2:
      return "book";
    case 3:
      return "article";
    default:
      return "article";
  }
}

export function formatDate(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return "";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("ar-KW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
