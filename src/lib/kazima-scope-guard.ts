/**
 * Pre-retrieval scope guard.
 *
 * Decides whether a user query is within the cultural / historical
 * heritage scope of the Kazima assistant. Off-topic queries (general
 * geography, finance, programming, current events, etc.) are rejected
 * with a friendly Arabic message and suggestion chips, before we waste
 * retrieval + LLM tokens on irrelevant searches.
 *
 * Strategy: deterministic keyword check first (fast, no API call).
 * Optional LLM fallback for ambiguous cases (currently disabled to keep
 * Phase 1 latency low; the hook is here for Phase 2).
 */

import { translateLatinQuery, isMostlyLatin } from "./kazima-name-dictionary";

// Heritage / Kazima domain — Arabic.
const ARABIC_WHITELIST = [
  "الكويت", "كويت", "كويتي", "خليج", "خليجي",
  "تراث", "تاريخ", "ثقاف", "ثقافة", "ثقافي",
  "مخطوط", "مخطوطات", "وثائق", "وثيقة", "أرشيف",
  "إجازة", "إجازات", "أسانيد", "سند",
  "مدرسة", "مباركية", "أحمدية", "كتاتيب",
  "شيخ", "علماء", "عالم", "إمام", "فقيه", "محدث",
  "قبيلة", "أسرة", "عائلة", "نسب", "أنساب",
  "مسجد", "ديوانية", "ديوان", "سور",
  "شخصية", "أعلام", "ترجمة", "ترجمات", "سيرة",
  "غوص", "بحر", "سفينة", "بوم", "نوخذة", "لؤلؤ",
  "قصر", "بيت", "بيوت", "حي", "أحياء", "فريج",
  "كاظمة", "صباح", "آل صباح", "أمير", "حاكم", "حكام",
  "قناع", "قناعي", "رشيد", "غنيم", "عدساني",
  "فيلكا", "جهراء", "شرق", "جبلة", "مرقاب", "قبلة",
  "صحيفة", "مجلة", "كتاب", "كتب", "مؤلف",
  "مولد", "نبوي", "هجري", "ميلادي",
  "خط", "خطاط", "زخرفة", "عمارة", "تراثية",
  "نفط", "تجارة", "اقتصاد كويتي", "تنمية",
];

// Common scholar / family names that should always pass.
const ARABIC_SCHOLAR_NAMES = [
  "القناعي", "الرشيد", "العدساني", "الغنيم", "الجاسر",
  "السالم", "الجابر", "الأحمد", "العبدالله", "المالكي",
  "ابن عيسى", "بن عيسى", "ابن سعود",
];

// Out-of-scope strong indicators. If any appears, reject regardless.
const ARABIC_BLACKLIST = [
  "بيتكوين", "عملة رقمية", "كريبتو", "أسهم", "بورصة",
  "عاصمة فرنسا", "عاصمة ألمانيا", "عاصمة أمريكا", "عاصمة بريطانيا",
  "كرة القدم", "مباراة", "دوري الأبطال",
  "وصفة", "طبخ", "طريقة عمل",
  "كود برمجي", "بايثون", "جافاسكربت",
];

const LATIN_WHITELIST = [
  "kuwait", "kuwaiti", "gulf", "arabia", "arabian",
  "heritage", "history", "historic", "historical",
  "manuscript", "ijazah", "isnad", "asanid",
  "school", "mubarakiyya", "mubarakiya", "ahmadiyya",
  "scholar", "shaykh", "sheikh", "shaikh", "imam",
  "tribe", "family", "lineage",
  "mosque", "diwaniya", "diwan",
  "biography", "bibliography",
  "diving", "pearl", "dhow", "boom",
  "palace", "neighborhood", "neighbourhood", "quarter",
  "kazima", "sabah", "al-sabah", "al sabah",
  "qenaei", "qenae", "qenai", "rasheed", "ghunaim",
  "failaka", "jahra", "sharq", "jibla", "mirqab", "qibla",
  "newspaper", "magazine", "book",
  "calligraphy", "architecture",
  "oil", "trade", "economy",
];

const LATIN_BLACKLIST = [
  "bitcoin", "ethereum", "crypto", "stock price", "nasdaq",
  "capital of france", "capital of germany", "capital of usa",
  "football", "soccer", "champions league", "world cup",
  "recipe", "cooking",
  "python code", "javascript", "javascript code",
];

function normalizeArabic(t: string): string {
  return t
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g, "")
    .replace(/ـ+/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي");
}

export type ScopeDecision = {
  inScope: boolean;
  reason: string;
  matchedTerms: string[];
  rejectionMessage?: string;
  suggestedChips?: string[];
};

const REJECTION_MESSAGE = "هذا المساعد متخصص في التراث الكويتي والخليجي. هل تود البحث في الأرشيف عن موضوع آخر؟";
const REJECTION_SUGGESTIONS = [
  "المدرسة المباركية",
  "الشيخ يوسف بن عيسى القناعي",
  "تاريخ الكويت",
  "الغوص على اللؤلؤ",
  "آل صباح",
];

export function classifyScope(rawQuery: string): ScopeDecision {
  const query = (rawQuery || "").trim();
  if (!query) {
    return { inScope: false, reason: "empty", matchedTerms: [] };
  }

  const normArabic = normalizeArabic(query);
  const lower = query.toLowerCase();

  // ── Strong reject: explicit off-topic indicator ──────────────
  for (const term of ARABIC_BLACKLIST) {
    const n = normalizeArabic(term);
    if (normArabic.includes(n)) {
      return {
        inScope: false,
        reason: "blacklist_arabic",
        matchedTerms: [term],
        rejectionMessage: REJECTION_MESSAGE,
        suggestedChips: REJECTION_SUGGESTIONS,
      };
    }
  }
  for (const term of LATIN_BLACKLIST) {
    if (lower.includes(term)) {
      return {
        inScope: false,
        reason: "blacklist_latin",
        matchedTerms: [term],
        rejectionMessage: REJECTION_MESSAGE,
        suggestedChips: REJECTION_SUGGESTIONS,
      };
    }
  }

  // ── Accept: heritage Arabic vocabulary ───────────────────────
  const arabicHits: string[] = [];
  for (const term of [...ARABIC_WHITELIST, ...ARABIC_SCHOLAR_NAMES]) {
    if (normArabic.includes(normalizeArabic(term))) arabicHits.push(term);
  }
  if (arabicHits.length > 0) {
    return { inScope: true, reason: "arabic_whitelist", matchedTerms: arabicHits };
  }

  // ── Accept: Latin heritage vocabulary ────────────────────────
  const latinHits: string[] = [];
  for (const term of LATIN_WHITELIST) {
    if (lower.includes(term)) latinHits.push(term);
  }
  if (latinHits.length > 0) {
    return { inScope: true, reason: "latin_whitelist", matchedTerms: latinHits };
  }

  // ── Accept: dictionary-known person/place name (Latin) ───────
  if (isMostlyLatin(query)) {
    const { matchedKeys } = translateLatinQuery(query);
    if (matchedKeys.length > 0) {
      return { inScope: true, reason: "latin_name_dictionary", matchedTerms: matchedKeys };
    }
  }

  // ── Default: reject. We err on the side of being a heritage
  //    assistant rather than a general search engine.
  return {
    inScope: false,
    reason: "no_heritage_signal",
    matchedTerms: [],
    rejectionMessage: REJECTION_MESSAGE,
    suggestedChips: REJECTION_SUGGESTIONS,
  };
}
