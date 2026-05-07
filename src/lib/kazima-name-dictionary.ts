/**
 * Arabic ↔ English name dictionary for Kuwaiti / Gulf heritage entities.
 *
 * Used by the retrieval pipeline when a user submits a query that is
 * predominantly in Latin characters. We translate well-known names to
 * their canonical Arabic spellings before running the keyword search,
 * because the Kazima corpus is Arabic.
 *
 * To extend: add new entries to NAME_MAP. Each entry maps an English
 * spelling (lowercased) to one or more canonical Arabic forms. Use the
 * `addAliases` helper to add common transliteration variants (al-, bin/ibn,
 * dropping prefixes, etc.). Aliases are also stored lowercased.
 *
 * Coverage scope: Kuwaiti rulers, scholars, institutions, neighborhoods,
 * and a small number of regional figures that appear frequently in queries.
 */

export interface NameEntry {
  arabic: string[]; // canonical Arabic forms (1+ variants)
  notes?: string;
}

const RAW: Record<string, NameEntry> = {
  // ── Rulers / royals ─────────────────────────────────────────────
  "mubarak al-sabah": { arabic: ["مبارك الصباح", "الشيخ مبارك الصباح", "مبارك الكبير"] },
  "mubarak the great": { arabic: ["مبارك الكبير", "الشيخ مبارك الصباح"] },
  "abdullah al-salem": { arabic: ["عبدالله السالم", "الشيخ عبدالله السالم", "عبد الله السالم الصباح"] },
  "sheikh abdullah al-salem": { arabic: ["عبدالله السالم", "الشيخ عبدالله السالم"] },
  "abdullah al-salim": { arabic: ["عبدالله السالم"] },
  "ahmad al-jaber": { arabic: ["أحمد الجابر", "الشيخ أحمد الجابر الصباح"] },
  "sabah al-salem": { arabic: ["صباح السالم", "الشيخ صباح السالم"] },
  "jaber al-ahmad": { arabic: ["جابر الأحمد", "الشيخ جابر الأحمد الصباح"] },
  "saad al-abdullah": { arabic: ["سعد العبدالله", "الشيخ سعد العبدالله"] },
  "sabah al-ahmad": { arabic: ["صباح الأحمد", "الشيخ صباح الأحمد"] },
  "nawaf al-ahmad": { arabic: ["نواف الأحمد", "الشيخ نواف الأحمد"] },
  "meshal al-ahmad": { arabic: ["مشعل الأحمد", "الشيخ مشعل الأحمد"] },

  // ── Scholars / ulema / authors ──────────────────────────────────
  "yusuf bin issa al-qenaei": { arabic: ["يوسف بن عيسى القناعي", "القناعي", "الشيخ يوسف بن عيسى القناعي"] },
  "yusuf bin isa al-qenaei": { arabic: ["يوسف بن عيسى القناعي", "القناعي"] },
  "yusuf ibn issa al-qenaei": { arabic: ["يوسف بن عيسى القناعي", "القناعي"] },
  "yusuf al-qenaei": { arabic: ["يوسف القناعي", "يوسف بن عيسى القناعي", "القناعي"] },
  "yusuf al qenaei": { arabic: ["يوسف القناعي", "يوسف بن عيسى القناعي", "القناعي"] },
  "al-qenaei": { arabic: ["القناعي", "يوسف بن عيسى القناعي"] },
  "al qenaei": { arabic: ["القناعي", "يوسف بن عيسى القناعي"] },
  "qenaei": { arabic: ["القناعي"] },
  "qinai": { arabic: ["القناعي", "يوسف بن عيسى القناعي"] },
  "al-qina'i": { arabic: ["القناعي", "يوسف بن عيسى القناعي"] },
  "al qinai": { arabic: ["القناعي", "يوسف بن عيسى القناعي"] },
  "qina'i": { arabic: ["القناعي", "يوسف بن عيسى القناعي"] },
  "abdulaziz al-rasheed": { arabic: ["عبدالعزيز الرشيد", "الشيخ عبدالعزيز الرشيد"] },
  "abd al-aziz al-rashid": { arabic: ["عبدالعزيز الرشيد"] },
  "khaled al-adsani": { arabic: ["خالد العدساني"] },
  "abdullah al-khalaf": { arabic: ["عبدالله الخلف"] },
  "yacoub al-ghunaim": { arabic: ["يعقوب الغنيم"] },
  "khalid al-jasser": { arabic: ["خالد الجاسر"] },

  // ── Institutions / schools ──────────────────────────────────────
  "mubarakiya school": { arabic: ["المدرسة المباركية", "مدرسة المباركية"] },
  "al-mubarakiyya school": { arabic: ["المدرسة المباركية"] },
  "ahmadiyya school": { arabic: ["المدرسة الأحمدية", "مدرسة الأحمدية"] },
  "kuwait university": { arabic: ["جامعة الكويت"] },
  "national assembly": { arabic: ["مجلس الأمة"] },
  "dasman palace": { arabic: ["قصر دسمان"] },
  "seif palace": { arabic: ["قصر السيف"] },

  // ── Places / neighborhoods ──────────────────────────────────────
  "kuwait": { arabic: ["الكويت"] },
  "kuwait city": { arabic: ["مدينة الكويت", "الكويت"] },
  "jahra": { arabic: ["الجهراء"] },
  "failaka": { arabic: ["فيلكا", "جزيرة فيلكا"] },
  "sharq": { arabic: ["شرق"] },
  "jibla": { arabic: ["جبلة"] },
  "mirqab": { arabic: ["المرقاب"] },
  "qibla": { arabic: ["القبلة"] },
  "kazima": { arabic: ["كاظمة"] },

  // ── Topics / themes ─────────────────────────────────────────────
  "history of kuwait": { arabic: ["تاريخ الكويت"] },
  "kuwaiti heritage": { arabic: ["التراث الكويتي", "تراث الكويت"] },
  "manuscripts": { arabic: ["المخطوطات", "مخطوطات"] },
  "islamic manuscripts": { arabic: ["المخطوطات الإسلامية"] },
  "ijazah": { arabic: ["الإجازة", "الإجازات"] },
  "asanid": { arabic: ["الأسانيد"] },
  "diwaniya": { arabic: ["الديوانية"] },
  "boom ship": { arabic: ["البوم", "السفن البومية"] },
  "pearl diving": { arabic: ["الغوص على اللؤلؤ"] },
  "dhow": { arabic: ["السفن الشراعية"] },
};

const NAME_MAP: Map<string, NameEntry> = new Map();

function normKey(k: string): string {
  return k
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addAliases(key: string, entry: NameEntry) {
  const base = normKey(key);
  NAME_MAP.set(base, entry);

  // Strip "al-" / "al " prefix variant
  const noAl = base.replace(/^al /, "").replace(/\bal /g, "");
  if (noAl !== base) NAME_MAP.set(noAl, entry);

  // bin / ibn variants
  if (base.includes(" bin ")) NAME_MAP.set(base.replace(/ bin /g, " ibn "), entry);
  if (base.includes(" ibn ")) NAME_MAP.set(base.replace(/ ibn /g, " bin "), entry);

  // remove honorifics
  ["sheikh ", "shaikh ", "shaykh ", "imam ", "dr ", "doctor "].forEach((h) => {
    if (base.startsWith(h)) NAME_MAP.set(base.slice(h.length), entry);
  });
}

for (const [k, v] of Object.entries(RAW)) addAliases(k, v);

export function isMostlyLatin(text: string): boolean {
  const stripped = text.replace(/[\s\d\p{P}]/gu, "");
  if (stripped.length === 0) return false;
  const latin = (stripped.match(/[A-Za-z]/g) || []).length;
  return latin / stripped.length >= 0.6;
}

/**
 * Look up an English query (or substring) and return Arabic forms found.
 * Performs longest-match-first scan over known keys.
 */
export function translateLatinQuery(query: string): { arabicTerms: string[]; matchedKeys: string[] } {
  const norm = normKey(query);
  if (!norm) return { arabicTerms: [], matchedKeys: [] };

  const keys = Array.from(NAME_MAP.keys()).sort((a, b) => b.length - a.length);
  const arabicTerms = new Set<string>();
  const matchedKeys: string[] = [];

  let work = " " + norm + " ";
  for (const key of keys) {
    const padded = " " + key + " ";
    if (work.includes(padded)) {
      const entry = NAME_MAP.get(key)!;
      entry.arabic.forEach((a) => arabicTerms.add(a));
      matchedKeys.push(key);
      // Replace match with a separator so we do not double-match overlaps.
      work = work.split(padded).join(" | ");
    }
  }

  return { arabicTerms: Array.from(arabicTerms), matchedKeys };
}

/** Total entry count (after alias expansion). */
export function getDictionarySize(): number {
  return NAME_MAP.size;
}
