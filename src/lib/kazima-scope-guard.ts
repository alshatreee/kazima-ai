/**
 * Pre-retrieval scope guard.
 *
 * Decides whether a user query is within the cultural / historical
 * heritage scope of the Kazima assistant. Off-topic queries (general
 * geography, finance, programming, current events, planetary science,
 * etc.) are rejected with a friendly Arabic message and suggestion
 * chips, before we waste retrieval + LLM tokens on irrelevant searches.
 *
 * Strategy: deterministic keyword check first (fast, no API call).
 *
 * Phase 2 fix: previously a single Kuwait keyword like "كويت" was
 * enough to pass — so "تاريخ المريخ في الكويت" (history of Mars in
 * Kuwait) wrongly survived. Now we use a co-occurrence heuristic:
 * pass only if either
 *   • a known entity (scholar / place / institution) appears, OR
 *   • at least 2 of {kuwait_id, heritage_signal, entity_name} fire.
 * Plus an expanded blacklist that catches common cosmic / off-topic
 * subjects.
 */

import { translateLatinQuery, isMostlyLatin } from "./kazima-name-dictionary";

// ── Category 1: kuwait / gulf identity (geographic frame) ──────────
const KUWAIT_ID_AR = ["الكويت", "كويت", "كويتي", "كويتيه", "خليج", "خليجي", "الخليج"];
const KUWAIT_ID_LATIN = ["kuwait", "kuwaiti", "gulf", "arabia", "arabian"];

// ── Category 2: heritage / cultural signal (topic flavor) ──────────
const HERITAGE_AR = [
  "تراث", "تاريخ", "ثقاف", "ثقافة", "ثقافي",
  "مخطوط", "مخطوطات", "وثائق", "وثيقة", "أرشيف",
  "إجازة", "إجازات", "أسانيد", "سند", "ديوانية", "ديوان",
  "نسب", "أنساب", "سيرة", "ترجمة", "ترجمات", "أعلام", "شخصية",
  "شيخ", "علماء", "عالم", "إمام", "فقيه", "محدث",
  "غوص", "بحر", "سفينة", "بوم", "نوخذة", "لؤلؤ",
  "بيت", "بيوت", "حي", "أحياء", "فريج", "سور",
  "مباركية", "أحمدية", "كتاتيب",
  "أمير", "حاكم", "حكام",
  "مولد", "نبوي", "هجري", "ميلادي",
  "خط", "خطاط", "زخرفة", "عمارة", "تراثية",
  "صحيفة", "مجلة", "كتاب", "مؤلف",
  "نفط", "تجارة", "اقتصاد كويتي", "تنمية",
  "قبيلة", "أسرة", "عائلة",
  "مسجد", "مساجد",
];
const HERITAGE_LATIN = [
  "heritage", "history", "historic", "historical",
  "manuscript", "manuscripts", "ijazah", "isnad", "asanid",
  "school", "scholar", "shaykh", "sheikh", "shaikh", "imam",
  "tribe", "family", "lineage",
  "mosque", "diwaniya", "diwan",
  "biography", "bibliography",
  "diving", "pearl", "dhow", "boom",
  "palace", "neighborhood", "neighbourhood", "quarter",
  "newspaper", "magazine", "book",
  "calligraphy", "architecture",
  "oil", "trade", "economy",
];

// ── Category 3: known entities (scholars, places, institutions) ────
const ENTITY_AR = [
  "القناعي", "الرشيد", "العدساني", "الغنيم", "الجاسر", "الخلف",
  "السالم", "الجابر", "الأحمد", "العبدالله", "المالكي",
  "ابن عيسى", "بن عيسى", "ابن سعود",
  "فيلكا", "الجهراء", "جهراء", "شرق", "جبلة", "المرقاب", "القبلة",
  "المباركية", "الأحمدية", "مدرسة المباركية", "مدرسة الأحمدية",
  "قصر دسمان", "قصر السيف", "جامعة الكويت", "مجلس الأمة",
  "مبارك الكبير", "مبارك الصباح",
  "كاظمة", "آل صباح", "آل الصباح",
];
const ENTITY_LATIN_HINTS = [
  "qenaei", "qenae", "qenai", "qinai", "qina",
  "rasheed", "rashid", "ghunaim", "adsani",
  "mubarakiya", "mubarakiyya", "ahmadiyya",
  "failaka", "jahra", "jibla", "mirqab", "qibla",
  "sabah", "al-sabah", "al sabah",
  "kazima",
];

// ── Out-of-scope strong indicators. If any appears, reject. ────────
const ARABIC_BLACKLIST = [
  "بيتكوين", "عملة رقمية", "كريبتو", "أسهم", "بورصة",
  "عاصمة فرنسا", "عاصمة ألمانيا", "عاصمة أمريكا", "عاصمة بريطانيا",
  "كرة القدم", "مباراة", "دوري الأبطال",
  "وصفة", "طبخ", "طريقة عمل",
  "كود برمجي", "بايثون", "جافاسكربت",
  // Cosmic / off-topic subjects (Phase 2 tightening)
  "المريخ", "الزهرة", "المشتري", "زحل", "كوكب", "كواكب", "الفضاء", "نجوم", "مجرة",
  "الذكاء الاصطناعي", "الكمبيوتر", "الحاسوب",
];
const LATIN_BLACKLIST = [
  "bitcoin", "ethereum", "crypto", "stock price", "nasdaq",
  "capital of france", "capital of germany", "capital of usa",
  "football", "soccer", "champions league", "world cup",
  "recipe", "cooking",
  "python code", "javascript", "javascript code",
  "mars", "jupiter", "saturn", "venus", "neptune", "uranus",
  "planet", "outer space", "galaxy", "nebula",
];

function normalizeArabic(t: string): string {
  // NOTE: previously used the range /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/ which silently
  // matched standard Arabic letters in U+0620-U+064A, collapsing every
  // Arabic input to the empty string. That made every "" .includes("")
  // check pass, which is part of why the scope guard was too lenient.
  // Strip ONLY combining marks / tashkeel / tatweel / Quranic small marks.
  return t
    .replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640+/g, "")
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
  signals?: { kuwait: number; heritage: number; entity: number };
};

const REJECTION_MESSAGE = "هذا المساعد متخصص في التراث الكويتي والخليجي. هل تود البحث في الأرشيف عن موضوع آخر؟";
const REJECTION_SUGGESTIONS = [
  "المدرسة المباركية",
  "الشيخ يوسف بن عيسى القناعي",
  "تاريخ الكويت",
  "الغوص على اللؤلؤ",
  "آل صباح",
];

function countHits(haystackNorm: string, terms: string[], norm: (s: string) => string): { hits: string[]; count: number } {
  const hits: string[] = [];
  for (const t of terms) {
    const n = norm(t);
    if (!n) continue;
    if (haystackNorm.includes(n)) hits.push(t);
  }
  return { hits, count: hits.length };
}

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

  // ── Co-occurrence scoring across the three categories ────────
  const kuwaitAr = countHits(normArabic, KUWAIT_ID_AR, normalizeArabic);
  const kuwaitLat = countHits(lower, KUWAIT_ID_LATIN, (s) => s.toLowerCase());
  const heritageAr = countHits(normArabic, HERITAGE_AR, normalizeArabic);
  const heritageLat = countHits(lower, HERITAGE_LATIN, (s) => s.toLowerCase());
  const entityAr = countHits(normArabic, ENTITY_AR, normalizeArabic);
  const entityLatHints = countHits(lower, ENTITY_LATIN_HINTS, (s) => s.toLowerCase());

  let entityHits = entityAr.count + entityLatHints.count;
  let entityTerms: string[] = [...entityAr.hits, ...entityLatHints.hits];

  // Latin-only queries can also match the full name dictionary —
  // a strong entity signal (e.g. "Yusuf bin Issa Al-Qenaei"). Filter
  // out generic keys like "kuwait" / "kuwait city" / "gulf" so they
  // route through the kuwait_id category instead of being promoted
  // to a free entity pass.
  const GENERIC_DICT_KEYS = new Set([
    "kuwait", "kuwait city", "gulf",
    "history of kuwait", "kuwaiti heritage",
  ]);
  if (isMostlyLatin(query)) {
    const { matchedKeys } = translateLatinQuery(query);
    const significant = matchedKeys.filter((k) => !GENERIC_DICT_KEYS.has(k));
    if (significant.length > 0) {
      entityHits += significant.length;
      entityTerms.push(...significant);
    }
  }

  const kuwait = kuwaitAr.count + kuwaitLat.count;
  const heritage = heritageAr.count + heritageLat.count;

  const matchedTerms = [
    ...kuwaitAr.hits, ...kuwaitLat.hits,
    ...heritageAr.hits, ...heritageLat.hits,
    ...entityTerms,
  ];

  // Pass rule 1: any specific entity match is sufficient on its own.
  if (entityHits > 0) {
    return {
      inScope: true,
      reason: "entity_match",
      matchedTerms,
      signals: { kuwait, heritage, entity: entityHits },
    };
  }

  // Pass rule 2: kuwait identity + at least one heritage signal.
  if (kuwait > 0 && heritage > 0) {
    return {
      inScope: true,
      reason: "co_occurrence",
      matchedTerms,
      signals: { kuwait, heritage, entity: entityHits },
    };
  }

  // Pass rule 3: multiple distinct heritage signals — strong topical
  // focus even without the word "Kuwait" itself (e.g., "الغوص على اللؤلؤ").
  if (heritage >= 2) {
    return {
      inScope: true,
      reason: "heritage_cluster",
      matchedTerms,
      signals: { kuwait, heritage, entity: entityHits },
    };
  }

  // ── Default: reject. Heritage assistant, not general search. ─
  return {
    inScope: false,
    reason: "no_heritage_signal",
    matchedTerms,
    signals: { kuwait, heritage, entity: entityHits },
    rejectionMessage: REJECTION_MESSAGE,
    suggestedChips: REJECTION_SUGGESTIONS,
  };
}
